import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

test('sustained Arcade, rematches, Training and local play keep audio and runtime state bounded', async ({ page }, testInfo) => {
  const errors = [], samples = [], began = Date.now();
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.soakMetrics = { sources: 0, active: 0, peak: 0, connected: new Set(), gains: new Set(), contexts: new Set(), frames: [], intervals: [], previous: 0 };
    const create = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function () {
      const source = create.call(this), start = source.start.bind(source), m = window.soakMetrics;
      const connect = source.connect.bind(source), disconnect = source.disconnect.bind(source); m.contexts.add(this);
      source.connect = (...args) => { const result = connect(...args); m.connected.add(source); return result; };
      source.disconnect = (...args) => { disconnect(...args); m.connected.delete(source); };
      source.start = (...args) => { start(...args); m.sources++; m.active++; m.peak = Math.max(m.peak, m.active); };
      source.addEventListener('ended', () => m.active--, { once: true });
      return source;
    };
    const createGain = AudioContext.prototype.createGain;
    AudioContext.prototype.createGain = function () {
      const gain = createGain.call(this), connect = gain.connect.bind(gain), disconnect = gain.disconnect.bind(gain), m = window.soakMetrics;
      gain.connect = (...args) => { const result = connect(...args); m.gains.add(gain); return result; };
      gain.disconnect = (...args) => { disconnect(...args); m.gains.delete(gain); }; return gain;
    };
    const raf = requestAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => raf(time => {
      window.soakDrive?.(time);
      const m = window.soakMetrics, begin = performance.now(); callback(time);
      m.frames.push(performance.now() - begin);
      if (m.previous) m.intervals.push(time - m.previous);
      m.previous = time;
    });
    window.soakPads = [0, 1].map(index => ({ index, id: `Soak pad ${index}`, connected: true, mapping: 'standard', axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })) }));
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => window.soakPads });
  });
  // Test-only access and bots: real public observations -> virtual pads -> unchanged app/engine.
  await page.route('**/app.mjs', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()) + `
let soakTime = 0, soakSeed = 1930;
const soakRandom = () => ((soakSeed = (Math.imul(soakSeed, 1664525) + 1013904223) >>> 0) / 4294967296);
window.soakDrive = time => {
  const dt = Math.min(.05, soakTime ? (time - soakTime) / 1000 : 0); soakTime = time;
  for (let i = 0; i < 2; i++) {
    const pad = window.soakPads[i]; if (!pad) continue;
    const action = match && !paused && match.phase === 'fight' && controllers.slots[i]?.armed && (i === 0 || mode === 'local') ? cpuInput(match, dt, soakRandom, i, i ? 'normal' : 'hard') : {};
    const buttons = controls.settings.players[i].buttons;
    pad.axes = [Number(!!action.right) - Number(!!action.left), 0];
    pad.buttons.forEach((button, index) => { button.pressed = Object.entries(buttons).some(([name, value]) => value === index && action[name]); button.value = button.pressed ? 1 : 0; });
  }
};
window.soakState = () => ({ mode, paused, phase: match?.phase, elapsed: match?.elapsed, round: match?.round, stage: match?.stage, winner: match?.winner,
  fighters: match?.fighters.map(f => ({ id: f.id, hp: f.hp, x: f.x, y: f.y, meter: f.meter })),
  projectiles: match?.projectiles.length || 0, effects: match?.effects.length || 0, inputs: match?.training?.inputs.length || 0,
  voices: audio.voices.size, buffers: audio.buffers.size, loading: audio.loading.size, scene: audio.scene, music: !!audio.source,
  arcade: arcade && { index: arcade.index, status: arcade.status, losses: arcade.losses }, nodes: document.getElementsByTagName('*').length });` });
  });
  await page.goto('/'); await expect(page.locator('#start-button')).toBeEnabled();
  await page.locator('#settings-button').click(); await page.locator('#enable-audio').click();
  await expect(page.locator('#audio-status')).toContainText('Original 32-bar');
  await page.getByRole('button', { name: 'Close options', exact: true }).click();
  const sample = async label => {
    const value = await page.evaluate(() => {
      const state = window.soakState(), m = window.soakMetrics;
      const summary = list => { list.sort((a, b) => a - b); return { count: list.length, median: list[Math.floor(list.length * .5)] || 0, p95: list[Math.floor(list.length * .95)] || 0 }; };
      const result = { ...state, sources: m.sources, activeSources: m.active, connectedSources: m.connected.size, connectedGains: m.gains.size, contexts: m.contexts.size, peakSources: m.peak, callbackMs: summary(m.frames), intervalMs: summary(m.intervals) };
      m.frames = []; m.intervals = []; return result;
    });
    samples.push({ label, seconds: (Date.now() - began) / 1000, ...value });
    expect(errors).toEqual([]);
    expect(value.voices).toBeLessThanOrEqual(16); expect(value.activeSources).toBeLessThanOrEqual(20);
    expect(value.connectedSources).toBeLessThanOrEqual(20); expect(value.connectedGains).toBeLessThanOrEqual(4); expect(value.contexts).toBe(1);
    expect(value.buffers).toBeLessThanOrEqual(17); expect(value.inputs).toBeLessThanOrEqual(8);
    expect(value.projectiles).toBeLessThan(20); expect(value.effects).toBeLessThan(30);
    for (const fighter of value.fighters || []) for (const field of ['hp', 'x', 'y', 'meter']) expect(Number.isFinite(fighter[field]), `${label}: ${field}`).toBe(true);
    return value;
  };
  const waitFor = async (predicate, label, timeout = 180000) => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const state = await sample(label); if (predicate(state)) return state;
      await page.waitForTimeout(2000);
    }
    throw Error(`${label} did not complete`);
  };
  try {
    await page.locator('[data-slot="0"]').click(); await page.locator('[data-fighter="minnie"]').click();
    await page.locator('[data-mode="arcade"]').click(); await page.locator('[data-difficulty="easy"]').click(); await page.locator('#start-button').click();
    // Full real-time ladder: no outcome fixture, clock acceleration, health edits or skipped rounds.
    for (let bout = 0, attempts = 0; bout < 6;) {
      expect(++attempts).toBeLessThanOrEqual(18);
      await page.locator('#arcade-play').click();
      const result = await waitFor(state => state.mode === 'arcade' && !state.fighters, `Arcade bout ${bout + 1}`);
      expect(result.arcade.index).toBeGreaterThanOrEqual(bout); bout = result.arcade.index;
      console.log(`${testInfo.project.name}: Arcade ${bout}/6, ${result.arcade.losses} losses`);
    }
    await expect(page.locator('#arcade-ending')).toBeVisible();
    const checkpoint = await page.evaluate(() => localStorage.getItem('pdcf-arcade-v1'));
    await page.reload(); await expect(page.locator('#start-button')).toBeEnabled(); await page.locator('#arcade-resume').click();
    await expect(page.locator('#arcade-ending')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('pdcf-arcade-v1'))).toBe(checkpoint);
    await page.locator('#arcade-exit').click();

    for (const mode of ['cpu', 'local']) {
      await page.locator(`[data-mode="${mode}"]`).click();
      if (mode === 'cpu') await page.locator('[data-difficulty="easy"]').click();
      await page.locator(`[data-stage="${mode === 'cpu' ? 'silverscreen-theater' : 'moonlight-midway'}"]`).click();
      await page.locator('[data-slot="1"]').click(); await page.locator('[data-fighter="popeye"]').click(); await page.locator('#start-button').click();
      for (let match = 0; match < 3; match++) {
        await waitFor(state => state.phase === 'matchover', `${mode} match ${match + 1}`);
        console.log(`${testInfo.project.name}: ${mode} match ${match + 1}/3 complete`);
        await expect(page.locator('#result-dialog')).toBeVisible();
        if (match < 2) { await page.locator('#rematch-button').click(); await expect(page.locator('#result-dialog')).toBeHidden(); }
      }
      await page.locator('#roster-button').click();
    }

    await page.locator('[data-mode="training"]').click(); await page.locator('[data-stage="midnight-junction"]').click(); await page.locator('#start-button').click();
    await page.locator('#training-options').click();
    for (let i = 0; i < 3; i++) await page.locator('#dummy-mode').click();
    await page.getByRole('button', { name: 'BACK TO PRACTICE →', exact: true }).click(); await expect(page.locator('#arena')).toBeFocused();
    // Prime the lazily populated move table before measuring repeated-menu DOM growth.
    await page.locator('#pause-button').click(); await page.locator('#moves-pause').click();
    await page.getByRole('button', { name: 'Close move lists', exact: true }).click();
    await page.locator('#resume-button').click(); await expect(page.locator('#arena')).toBeFocused();
    const start = await sample('Training start'), trainingBegan = Date.now();
    for (let cycle = 0; cycle < 6; cycle++) {
      await page.waitForTimeout(20000); const before = await sample(`Training ${cycle + 1}`);
      console.log(`${testInfo.project.name}: Training ${cycle + 1}/6, ${before.sources} audio sources played`);
      expect(before.nodes).toBeLessThanOrEqual(start.nodes + 20);
      await page.locator('#pause-button').click();
      const paused = await sample('Paused'); await page.waitForTimeout(300);
      const quiet = await sample('Paused quiet'); expect(quiet.activeSources).toBe(0); expect(quiet.connectedSources).toBe(0); expect(quiet.connectedGains).toBe(2); expect(quiet.voices).toBe(0); expect(quiet.music).toBe(false); expect(quiet.elapsed).toBe(paused.elapsed);
      await page.locator('#moves-pause').click(); await page.getByRole('button', { name: 'Close move lists', exact: true }).click();
      await expect(page.locator('#pause-dialog')).toBeVisible(); await page.locator('#resume-button').click();
      if (cycle === 2) {
        await page.evaluate(() => { window.soakPads[0] = null; }); await expect(page.locator('#pause-dialog')).toBeVisible();
        await page.evaluate(() => { window.soakPads[0] = { index: 3, id: 'Soak pad 0', connected: true, mapping: 'standard', axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })) }; });
        await expect(page.locator('#controller-status')).toContainText('P1 CONTROLLER READY'); await page.locator('#resume-button').click();
      }
    }
    const end = await sample('Training end'); expect(end.elapsed - start.elapsed).toBeGreaterThan(100);
    expect(Date.now() - trainingBegan).toBeGreaterThanOrEqual(120000);
    await page.locator('#back-button').click(); await page.locator('#sound-button').click();
    await page.waitForTimeout(300); const quiet = await sample('Finished muted'); expect(quiet.activeSources).toBe(0); expect(quiet.loading).toBe(0);
    expect(quiet.buffers).toBe(17); expect(quiet.sources).toBeGreaterThan(100); expect(errors).toEqual([]);
  } finally {
    const file = testInfo.outputPath('soak.json');
    await writeFile(file, JSON.stringify({ browser: testInfo.project.name, wallSeconds: (Date.now() - began) / 1000, errors, samples }, null, 2));
    await testInfo.attach('soak.json', { path: file, contentType: 'application/json' });
  }
});
