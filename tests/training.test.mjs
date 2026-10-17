import test from 'node:test';
import assert from 'node:assert/strict';
import { ROSTER, createMatch, resetTraining, trainingInput, tick, moveFor } from '../engine.mjs';
import { celFor } from '../cels.mjs';

const dt = 1 / 120;
function step(m, count, player = {}) { for (let i = 0; i < count; i++) tick(m, [player, trainingInput(m, dt, () => .1)], dt); }
function strike(m, kind = 'punch') { tick(m, [{ [kind]: true }, trainingInput(m, dt)], dt); step(m, 80); }

test('training starts immediately, stays endless, and reset preserves cast and practice options', () => {
  const m = createMatch('minnie', 'felix', 'training');
  assert.equal(m.phase, 'fight'); assert.equal(m.fighters[0].meter, 100);
  step(m, 7500); assert.equal(m.time, 60); assert.equal(m.phase, 'fight');
  m.training.dummy = 'guard'; m.training.infiniteInk = false; m.training.infiniteHealth = false;
  m.fighters[0].x = 1000; m.fighters[0].attack = { kind: 'kick' }; m.hitstop = .1;
  m.projectiles.push({}); m.training.inputs.push('Kick');
  resetTraining(m);
  assert.deepEqual(m.fighters.map(f => f.id), ['minnie', 'felix']);
  assert.deepEqual(m.fighters.map(f => [f.x, f.hp, f.meter, f.wins]), [[520, 100, 35, 0], [620, 100, 35, 0]]);
  assert.equal(m.training.dummy, 'guard'); assert.equal(m.training.infiniteHealth, false);
  assert.equal(m.hitstop, 0); assert.equal(m.projectiles.length, 0); assert.equal(m.fighters[0].attack, null);
  assert.deepEqual(m.training.inputs, []); assert.equal(m.training.lastHit, null);
});

test('dummy behaviors stand, guard, jump and spar through the real simulation', () => {
  const m = createMatch('mickey', 'popeye', 'training');
  assert.deepEqual(trainingInput(m, dt), {});
  m.training.dummy = 'guard'; strike(m);
  assert.equal(m.training.lastHit.blocked, true); assert.equal(m.training.lastHit.damage, 1.2);
  m.training.dummy = 'jump'; step(m, 10); assert.ok(m.fighters[1].y < 0);
  m.training.dummy = 'cpu'; m.ai.clock = 0;
  const commands = trainingInput(m, dt, () => .1);
  assert.equal(typeof commands.punch, 'boolean');
  assert.ok(Object.values(commands).some(Boolean));
});

test('unlimited health prevents KO and recovers between strings; ink and damage options are independent', () => {
  const m = createMatch('mickey', 'popeye', 'training');
  m.fighters[1].hp = 2; strike(m);
  assert.equal(m.fighters[1].hp, 1); assert.equal(m.phase, 'fight');
  assert.equal(m.training.lastHit.damage, 8);
  step(m, 100); assert.equal(m.fighters[1].hp, 100);
  strike(m, 'special'); assert.equal(m.fighters[0].meter, 100);
  m.training.infiniteInk = false; resetTraining(m); strike(m, 'special');
  assert.ok(m.fighters[0].meter < 35);
  m.training.infiniteHealth = false; resetTraining(m); m.fighters[1].hp = 2;
  tick(m, [{ punch: true }, {}], dt); step(m, 20);
  assert.equal(m.phase, 'roundover'); assert.equal(m.fighters[0].wins, 0);
  step(m, 300); assert.equal(m.phase, 'fight'); assert.equal(m.round, 1); assert.equal(m.fighters[1].hp, 100);
});

test('training input history records actions and direction changes without held-direction spam', () => {
  const m = createMatch('mickey', 'popeye', 'training');
  step(m, 30, { left: true }); assert.deepEqual(m.training.inputs, ['←']);
  tick(m, [{ left: true, punch: true }, {}], dt); assert.equal(m.training.inputs[0], 'Punch');
  for (let i = 0; i < 12; i++) tick(m, [{ [i % 2 ? 'left' : 'right']: true }, {}], dt);
  assert.equal(m.training.inputs.length, 8);
  assert.equal(m.training.inputs[0], '←');
});

test('combo damage counts connected hits during stun, while a recovered opponent starts a new combo', () => {
  const m = createMatch('mickey', 'popeye', 'training');
  tick(m, [{ punch: true }, {}], dt);
  while (!m.hitstop) tick(m, [{}, {}], dt);
  tick(m, [{ kick: true }, {}], dt); step(m, 40);
  assert.equal(m.training.lastHit.hits, 2); assert.equal(m.training.lastHit.comboDamage, 20);
  step(m, 45); m.fighters[0].x = m.fighters[1].x - 90;
  assert.equal(m.fighters[1].hurt, 0); assert.ok(m.fighters[0].comboTime > 0);
  strike(m); assert.equal(m.training.lastHit.hits, 1); assert.equal(m.training.lastHit.comboDamage, 8);
  for (const { id } of ROSTER) {
    const bout = createMatch(id, 'popeye', 'training');
    tick(bout, [{ punch: true }, {}], dt);
    for (let i = 0; i < 40 && !bout.hitstop; i++) tick(bout, [{}, {}], dt);
    assert.ok(bout.hitstop > 0, `${id}: punch connected`);
    tick(bout, [{ kick: true }, {}], dt); step(bout, 60);
    assert.equal(bout.training.lastHit.hits, 2, `${id}: hit-confirm kick remains a true combo`);
  }
});

test('every fighter selects distinct dash, throw and aerial cels at the actual move windows', () => {
  for (const { id } of ROSTER) {
    const f = createMatch(id).fighters[0];
    f.dash = .15; assert.equal(celFor(f), 36); f.dash = 0;
    for (const [kind, air, base] of [['throw', false, 39], ['punch', true, 42], ['kick', true, 45]]) {
      const move = moveFor(f, kind); f.attack = { kind, air, time: 0 };
      assert.equal(celFor(f), base);
      f.attack.time = move.active; assert.equal(celFor(f), base + 1);
      f.attack.time = move.until + .001; assert.equal(celFor(f), base + 2);
    }
  }
  assert.ok(moveFor({ id: 'minnie' }, 'punch').active < moveFor({ id: 'mickey' }, 'punch').active);
  assert.ok(moveFor({ id: 'oswald' }, 'punch').duration > moveFor({ id: 'mickey' }, 'punch').duration);
});
