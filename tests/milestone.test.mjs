import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createMatch, tick, moveFor } from '../engine.mjs';
import { celFor } from '../cels.mjs';
import { Controllers, readPad } from '../assets/runtime/controllers.mjs';
import { audioSettings } from '../assets/runtime/audio.mjs';
import { composeHarbor, effect, EFFECTS, MUSIC_SECONDS, RATE, wav } from '../scripts/build-audio.mjs';

const frame = 1 / 120;
function fight() { const m = createMatch(); m.phase = 'fight'; m.fighters[0].x = 500; m.fighters[1].x = 590; return m; }
function step(m, count, commands = [{}, {}]) { for (let i = 0; i < count; i++) tick(m, commands, frame); }
function pad(index = 0, buttons = [], axes = [0, 0]) { return { index, id: 'Virtual standard ' + index, connected: true, mapping: 'standard', buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: buttons.includes(i), value: buttons.includes(i) ? 1 : 0 })), axes }; }

test('controllers use a dead zone, stable player slots, and one-shot attacks', () => {
  assert.equal(readPad(pad(0, [], [.2, -.2])).left, false);
  const controls = new Controllers(); controls.poll([pad(3), pad(8)]);
  controls.poll([pad(8, [2]), pad(3, [0], [-.8, 0])]);
  assert.equal(controls.consume(0).jump, true); assert.equal(controls.consume(1).punch, true);
  assert.equal(controls.consume(0).jump, undefined);
  assert.equal(controls.consume(0).left, true);
  controls.poll([pad(8, [2]), pad(3, [0], [-.8, 0])]);
  assert.equal(controls.consume(1).punch, undefined);
  assert.deepEqual(controls.poll([pad(8)]).disconnected, [0]);
  assert.equal(controls.slots[1].index, 8);
});

test('joining, pause and resume require neutral; edges survive render frames without simulation ticks', () => {
  const controls = new Controllers(); controls.poll([pad(0, [2, 9])]);
  assert.deepEqual(controls.consume(0), {});
  controls.poll([pad()]); controls.poll([pad(0, [2])]); controls.poll([pad()]);
  assert.equal(controls.consume(0).punch, true);
  controls.clear(); controls.poll([pad(0, [2])]); assert.deepEqual(controls.consume(0), {});
  controls.poll([pad()]); controls.poll([pad(0, [2])]); assert.equal(controls.consume(0).punch, true);
  assert.equal(new Controllers().poll([{ ...pad(), mapping: '' }]).count, 0);
});

test('both controllers retain their assignments when reconnecting in reverse order', () => {
  const controls = new Controllers(); controls.poll([pad(0), pad(1)]);
  controls.poll([]);
  controls.poll([pad(1)]);
  assert.equal(controls.slots[0], null);
  assert.equal(controls.slots[1].index, 1);
  controls.poll([pad(1), pad(0)]);
  assert.deepEqual(controls.slots.map(slot => slot.index), [0, 1]);
});

test('hitstop freezes gameplay and clock, while allowing a buffered hit-confirm combo', () => {
  const m = fight(); tick(m, [{ punch: true }, {}], frame);
  while (!m.hitstop) tick(m, [{}, {}], frame);
  const clock = m.time, position = m.fighters[1].x;
  tick(m, [{ kick: true }, {}], frame);
  assert.equal(m.time, clock); assert.equal(m.fighters[1].x, position);
  assert.equal(m.fighters[0].buffer.kind, 'kick');
  step(m, 40);
  assert.equal(m.fighters[0].combo, 2); assert.equal(m.fighters[1].hp, 80);
});

test('blocked or missed punches cannot cancel; held guard survives block stun', () => {
  for (const blocked of [false, true]) {
    const m = fight(); if (!blocked) m.fighters[1].x = 1000;
    tick(m, [{ punch: true }, { guard: blocked }], frame); step(m, 13, [{}, { guard: blocked }]);
    tick(m, [{ kick: true }, { guard: blocked }], frame);
    assert.equal(m.fighters[0].attack.kind, 'punch');
    if (blocked) { assert.equal(m.fighters[1].reaction, 'block'); assert.equal(m.fighters[1].guard, true); }
  }
});

test('a projectile hit cannot confirm an unrelated whiffed punch', () => {
  const m = fight(); m.fighters[1].x = 900;
  m.projectiles.push({ x: 875, y: -95, direction: 1, owner: 0, kind: 'mickey', life: 1 });
  tick(m, [{ punch: true }, {}], frame);
  assert.ok(m.fighters[1].hp < 100);
  assert.equal(m.fighters[0].attack.connected, false);
});

test('a buffered attack comes out after recovery, but old inputs expire and intro inputs are discarded', () => {
  const m = fight(); m.fighters[0].cooldown = .07;
  tick(m, [{ punch: true }, {}], frame); step(m, 12);
  assert.equal(m.fighters[0].attack.kind, 'punch');
  const expired = fight(); expired.fighters[0].hurt = .4;
  tick(expired, [{ punch: true }, {}], frame); step(expired, 60);
  assert.equal(expired.fighters[0].attack, null); assert.equal(expired.fighters[0].buffer, null);
  const intro = createMatch(); tick(intro, [{ punch: true }, {}], frame); step(intro, 310);
  assert.equal(intro.fighters[0].attack, null); assert.equal(intro.fighters[1].hp, 100);
});

test('throws beat guard at close range and miss airborne fighters', () => {
  for (const airborne of [false, true]) {
    const m = fight(); m.fighters[1].x = 580;
    if (airborne) { m.fighters[1].y = -120; m.fighters[1].vy = -200; }
    tick(m, [{ throw: true }, { guard: true }], frame); step(m, 33, [{}, { guard: true }]);
    assert.equal(m.fighters[1].hp, airborne ? 100 : 86);
  }
});

test('dash is vulnerable, bounded and has a cooldown; aerial attacks have dedicated drawings', () => {
  const m = fight(); m.fighters[1].x = 1000;
  tick(m, [{ dash: true, left: true }, {}], frame);
  assert.ok(m.fighters[0].vx < -500); assert.ok(celFor(m.fighters[0]) >= 36);
  step(m, 25); tick(m, [{ dash: true, left: true }, {}], frame); assert.equal(m.fighters[0].dash, 0);
  step(m, 80, [{ left: true }, {}]); assert.ok(m.fighters[0].x >= 60);
  tick(m, [{ jump: true, right: true }, {}], frame); step(m, 8, [{ right: true }, {}]);
  tick(m, [{ punch: true }, {}], frame); assert.equal(m.fighters[0].attack.air, true); assert.equal(celFor(m.fighters[0]), 42);
  assert.ok(m.fighters[0].vx > 0, 'air attacks retain jump momentum');
  assert.ok(moveFor(m.fighters[1], 'punch').active > moveFor(m.fighters[0], 'punch').active);
});

test('audio preferences reject corrupt values and preserve mute and independent levels', () => {
  assert.deepEqual(audioSettings(null), { enabled: true, music: .45, effects: .7 });
  assert.deepEqual(audioSettings({ enabled: false, music: 7, effects: -.5 }), { enabled: false, music: 1, effects: 0 });
  assert.equal(audioSettings({ music: NaN, effects: 'loud' }).effects, .7);
});

test('the original score and all Foley assets contain valid, audible, unclipped PCM', async () => {
  const score = composeHarbor(); assert.equal(score.length, Math.round(MUSIC_SECONDS * RATE));
  for (const [name, data] of [['ink-harbor', score], ...EFFECTS.map(name => [name, effect(name)])]) {
    let peak = 0, energy = 0;
    for (const sample of data) { assert.ok(Number.isFinite(sample)); peak = Math.max(peak, Math.abs(sample)); energy += sample * sample; }
    assert.ok(peak > .05 && peak < 1, name + ' headroom'); assert.ok(energy / data.length > .00001, name + ' audible');
    const file = await readFile(new URL(`../assets/audio/${name}.wav`, import.meta.url));
    assert.equal(file.toString('ascii', 0, 4), 'RIFF'); assert.equal(file.readUInt32LE(24), RATE);
    assert.equal(file.length, 44 + data.length * 2);
    assert.ok(file.equals(wav(data)), name + ' checked-in asset matches its source');
  }
});
