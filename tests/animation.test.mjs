import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ROSTER, moveFor, createMatch, tick } from '../engine.mjs';
import { CEL_STATES, celFor, measureAtlas } from '../cels.mjs';
import { buildSheet, buildCel } from '../scripts/build-cels.mjs';

test('all 288 authored cels match their source, with 48 dedicated drawings for every fighter', async () => {
  assert.deepEqual(Object.values(CEL_STATES).flat(), Array.from({ length: 48 }, (_, i) => i));
  for (const { id } of ROSTER) {
    const count = 48;
    const source = await readFile(new URL(`../assets/cels/${id}.svg`, import.meta.url), 'utf8');
    assert.equal(source, buildSheet(id), `${id}: committed artwork matches its authoring source`);
    assert.equal((source.match(/data-cel=/g) || []).length, count);
    assert.equal(new Set(Array.from({ length: count }, (_, i) => buildCel(id, i))).size, count);
    assert.doesNotMatch(source, /NaN|undefined|<script|<image/);
    for (const [animation, frames] of Object.entries(CEL_STATES)) {
      for (const [i, index] of frames.entries()) {
        const cel = celFor({ id }, { animation, progress: (i + .1) / frames.length });
        assert.equal(cel, index);
      }
    }
  }
});

test('punch, kick, throw, and special impact drawings follow the actual damage windows', () => {
  for (const { id } of ROSTER) for (const kind of ['punch', 'kick', 'throw', 'special']) {
    const f = { id, attack: { kind, time: 0 } }, move = moveFor(f, kind), frames = CEL_STATES[kind];
    assert.equal(celFor(f), frames[0]);
    f.attack.time = move.active;
    assert.equal(celFor(f), kind === 'special' ? 26 : frames[1]);
    f.attack.time = move.until;
    assert.equal(celFor(f), kind === 'special' ? 26 : frames[1]);
    f.attack.time = move.until + .001;
    assert.equal(celFor(f), frames.at(-1));
  }
});

test('blocked strikes use a block recoil rather than a damage reaction', () => {
  for (const guard of [false, true]) {
    const m = createMatch(); m.phase = 'fight'; m.fighters[0].x = 500; m.fighters[1].x = 600;
    tick(m, [{ punch: true }, { guard }], 1 / 120);
    for (let i = 0; i < 11; i++) tick(m, [{}, { guard }], 1 / 120);
    assert.equal(m.fighters[1].reaction, guard ? 'block' : 'hurt');
    assert.equal(celFor(m.fighters[1]), guard ? 17 : 28);
  }
});

test('jumping, landing, walking backward, knockout and victory select their own poses', () => {
  const f = { id: 'mickey', y: -100, vy: -600, face: 1, vx: 100, walk: 0 };
  assert.equal(celFor(f), 12); f.vy = -20; assert.equal(celFor(f), 13); f.vy = 300; assert.equal(celFor(f), 14);
  f.y = 0; f.land = .1; assert.equal(celFor(f), 2); f.land = 0;
  assert.equal(celFor(f), 6); f.vx = -100; assert.equal(celFor(f), 11);
  assert.equal(celFor(f, { defeatTime: 0 }), 30);
  assert.equal(celFor(f, { defeatTime: .3 }), 31);
  assert.equal(celFor(f, { defeatTime: 2 }), 32);
  assert.equal(celFor(f, { victoryTime: .1 }), 33);
  assert.equal(celFor(f, { victoryTime: .4 }), 34);
  assert.equal(celFor(f, { victoryTime: 2 }), 35);
  assert.equal(celFor({ ...f, hurt: .2 }, { defeatTime: 1 }), 32);
});

test('landing exposure is brief and does not change jump physics', () => {
  const m = createMatch(); m.phase = 'fight';
  tick(m, [{ jump: true }, {}], 1 / 120);
  let landed = false;
  for (let i = 0; i < 150; i++) {
    tick(m, [{}, {}], 1 / 120);
    if (m.fighters[0].land > 0) { landed = true; assert.equal(m.fighters[0].y, 0); assert.equal(celFor(m.fighters[0]), 2); break; }
  }
  assert.ok(landed);
  for (let i = 0; i < 20; i++) tick(m, [{}, {}], 1 / 120);
  assert.equal(m.fighters[0].land, 0);
});

test('reduced motion freezes idle but preserves attack telegraphs', () => {
  const f = { id: 'popeye' };
  assert.equal(celFor(f, { time: 2, reducedMotion: true }), 0);
  assert.equal(celFor({ ...f, attack: { kind: 'punch', time: .17 } }, { reducedMotion: true }), 19);
  assert.throws(() => celFor(f, { animation: 'missing' }), /Unknown animation/);
});

test('transparent atlas bounds crop exactly, reject empty cells, and never include neighboring cels', () => {
  const width = 60, pixels = new Uint8ClampedArray(width * width * 4);
  for (let row = 0; row < 6; row++) for (let col = 0; col < 6; col++) {
    for (let y = row * 10 + 2; y <= row * 10 + 8; y++) for (let x = col * 10 + 3; x <= col * 10 + 6; x++) pixels[(y * width + x) * 4 + 3] = 255;
    pixels[(row * 10 * width + col * 10) * 4 + 3] = 16;
  }
  const frames = measureAtlas(pixels, width, width);
  assert.equal(frames.length, 36);
  for (const [i, f] of frames.entries()) {
    assert.equal(f.x, i % 6 * 10 + 3); assert.equal(f.y, Math.floor(i / 6) * 10 + 2);
    assert.equal(f.width, 4); assert.equal(f.height, 7);
  }
  assert.throws(() => measureAtlas(new Uint8ClampedArray(pixels.length), width, width), /Cel 1 is empty/);
  assert.throws(() => measureAtlas(pixels, 2, 2), /Invalid cel atlas dimensions/);
});
