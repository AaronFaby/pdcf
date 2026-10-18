import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { STAGES, stageFor, arcadeVenue } from '../assets/runtime/stages.mjs';
import { createMatch, resetTraining, tick } from '../engine.mjs';
import { createArcade, arcadeMatch, restoreArcade } from '../assets/runtime/arcade.mjs';
import { composeStage, BARS, RATE, wav } from '../scripts/build-audio.mjs';

test('all four venues have distinct paintings and scores, with a safe default', async () => {
  assert.equal(STAGES.length, 4); assert.equal(new Set(STAGES.map(s => s.id)).size, 4);
  assert.equal(new Set(STAGES.map(s => s.music)).size, 4);
  const images = new Set();
  for (const stage of STAGES) {
    const file = await readFile(new URL('../' + stage.image.slice(2), import.meta.url));
    assert.equal(file.subarray(1, 4).toString(), 'PNG');
    assert.ok(file.readUInt32BE(16) >= 1200); assert.ok(file.readUInt32BE(20) >= 675);
    images.add(createHash('sha256').update(file).digest('hex'));
  }
  assert.equal(images.size, 4);
  for (const bad of [undefined, null, 'missing', 'constructor', {}]) assert.equal(stageFor(bad).id, 'ink-harbor');
});

test('stage choice survives Training resets and round transitions without changing combat', () => {
  for (const stage of STAGES) {
    const practice = createMatch('minnie', 'popeye', 'training', 'normal', stage.id);
    practice.training.dummy = 'guard'; practice.training.infiniteInk = false;
    resetTraining(practice);
    assert.equal(practice.stage, stage.id); assert.equal(practice.training.dummy, 'guard'); assert.equal(practice.training.infiniteInk, false);
    const match = createMatch('mickey', 'popeye', 'local', 'normal', stage.id), baseline = createMatch('mickey', 'popeye', 'local');
    for (const m of [match, baseline]) { m.phase = 'fight'; m.fighters[0].x = 500; m.fighters[1].x = 590; }
    for (let i = 0; i < 180; i++) {
      const inputs = [{ punch: i === 0, kick: i === 25 }, {}];
      tick(match, inputs, 1 / 120); tick(baseline, inputs, 1 / 120);
    }
    assert.ok(match.fighters[1].hp < 100);
    assert.deepEqual({ ...match, stage: 'ink-harbor' }, baseline);
    match.time = 0; tick(match, [{}, {}], 1 / 120);
    for (let i = 0; i < 60; i++) tick(match, [{}, {}], .05);
    assert.equal(match.round, 2); assert.equal(match.stage, stage.id);
  }
  assert.equal(createMatch('mickey', 'popeye', 'cpu', 'normal', 'missing').stage, 'ink-harbor');
});

test('Arcade tours every venue, returns to the harbor finale, and restores old checkpoints', () => {
  const expected = ['ink-harbor', 'silverscreen-theater', 'moonlight-midway', 'midnight-junction', 'silverscreen-theater', 'ink-harbor'];
  for (let index = 0; index < 6; index++) {
    assert.equal(arcadeVenue(index).id, expected[index]);
    const old = { ...createArcade('felix'), index, attempts: index + 1, status: 'fighting' };
    const restored = restoreArcade(JSON.parse(JSON.stringify(old)));
    assert.ok(restored); assert.equal(restored.status, 'ready');
    const match = arcadeMatch(restored); assert.equal(match.stage, expected[index]);
    restored.status = 'lost'; restored.losses++;
    assert.equal(arcadeMatch(restored).stage, match.stage, 'continuing keeps the venue');
  }
});

test('three new original scores match their generated assets and have loop headroom', async () => {
  const hashes = new Set();
  for (const stage of STAGES.slice(1)) {
    const samples = composeStage(stage.id), expectedLength = Math.round(BARS * stage.beats * 60 / stage.tempo * RATE);
    assert.equal(samples.length, expectedLength);
    let peak = 0, energy = 0;
    for (const sample of samples) { assert.ok(Number.isFinite(sample)); peak = Math.max(peak, Math.abs(sample)); energy += sample * sample; }
    assert.ok(peak > .05 && peak < .9, stage.id + ' headroom');
    assert.ok(energy / samples.length > .00001, stage.id + ' non-silent');
    assert.ok(Math.abs(samples[0] - samples.at(-1)) < .06, stage.id + ' loop seam');
    const file = await readFile(new URL(`../assets/audio/${stage.id}.wav`, import.meta.url));
    assert.equal(file.readUInt32LE(24), RATE); assert.equal(file.readUInt16LE(34), 16);
    assert.ok(file.equals(wav(samples)), stage.id + ' source matches asset');
    hashes.add(createHash('sha256').update(file).digest('hex'));
  }
  assert.equal(hashes.size, 3);
});
