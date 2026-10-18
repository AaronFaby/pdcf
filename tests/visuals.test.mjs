import test from 'node:test';
import assert from 'node:assert/strict';
import { visualSettings, visualEffects } from '../assets/runtime/visuals.mjs';
import { createMatch, moveFor } from '../engine.mjs';
import { celFor } from '../cels.mjs';
import { drawScene } from '../art.mjs';

test('visual preferences validate saved data without coercing strings or retaining unknown fields', () => {
  const defaults = { motion: 'system', shake: true, film: true, backgrounds: true };
  for (const input of [null, 4, 'reduced', [], { motion: 'missing', shake: 'false', film: 0, backgrounds: null, extra: true }]) assert.deepEqual(visualSettings(input), defaults);
  assert.deepEqual(visualSettings({ motion: 'full', shake: false, film: false, backgrounds: false, extra: true }), { motion: 'full', shake: false, film: false, backgrounds: false });
});

test('system motion changes, explicit overrides and individual effect choices compose safely', () => {
  assert.equal(visualEffects(null, true).reducedMotion, true);
  assert.equal(visualEffects(null, false).reducedMotion, false);
  assert.equal(visualEffects({ motion: 'full' }, true).reducedMotion, false);
  for (const system of [true, false]) for (const shake of [true, false]) for (const film of [true, false]) for (const backgrounds of [true, false]) {
    assert.deepEqual(visualEffects({ motion: 'reduced', shake, film, backgrounds }, system), { reducedMotion: true, shake: false, film: false, backgrounds: false });
    assert.deepEqual(visualEffects({ motion: 'full', shake, film, backgrounds }, system), { reducedMotion: false, shake, film, backgrounds });
  }
});

test('decorative motion can freeze independently while attack, throw and reaction cels keep their cues', () => {
  const fighter = createMatch().fighters[0];
  for (const kind of ['punch', 'kick', 'special', 'throw']) {
    const move = moveFor(fighter, kind);
    for (const time of [0, move.active, move.until, move.until + .02]) {
      const f = { ...fighter, attack: { kind, time } };
      assert.equal(celFor(f, { reducedMotion: true }), celFor(f, { reducedMotion: false }));
    }
  }
  assert.equal(celFor({ ...fighter, thrown: { phase: 'air', time: .2 } }, { reducedMotion: true }), celFor({ ...fighter, thrown: { phase: 'air', time: .2 } }));
  assert.equal(celFor({ ...fighter, hurt: .2 }, { reducedMotion: true }), celFor({ ...fighter, hurt: .2 }));
});

test('scene rendering honors independent shake, film and scenery settings without mutating combat', () => {
  const match = createMatch(); match.phase = 'fight'; match.shake = 6;
  const before = structuredClone(match);
  const render = (time, options) => {
    const calls = [];
    const c = new Proxy({}, { get(target, name) {
      if (name in target) return target[name];
      return (...args) => { calls.push([name, ...args]); if (String(name).startsWith('create')) return { addColorStop() {} }; };
    } });
    drawScene(c, match, null, time, options); return calls;
  };
  const full = render(1, {}), noShake = render(1, { shake: false });
  assert.equal(full[2][0], 'translate'); assert.notEqual(noShake[2][0], 'translate');
  assert.equal(full.length - render(1, { film: false }).length, 72, 'film texture consists of 70 marks plus save/restore');
  const still = { shake: false, film: false, backgrounds: false };
  assert.deepEqual(render(1, still), render(3, still));
  assert.notDeepEqual(render(1, { shake: false, film: false }), render(3, { shake: false, film: false }));
  assert.deepEqual(render(1, { reducedMotion: true }), render(3, { reducedMotion: true }));
  assert.deepEqual(match, before);
});
