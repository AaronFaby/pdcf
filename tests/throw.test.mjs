import test from 'node:test';
import assert from 'node:assert/strict';
import { ROSTER, createMatch, resetTraining, tick } from '../engine.mjs';
import { celFor } from '../cels.mjs';

const dt = 1 / 120;
function fight(id = 'mickey', side = 0, edge = false) {
  const m = createMatch(id, id, 'local'); m.phase = 'fight';
  m.fighters[side].x = edge ? side ? 140 : 1060 : side ? 600 : 500;
  m.fighters[1 - side].x = m.fighters[side].x + (side ? -80 : 80);
  return m;
}
function input(side, command) { return side ? [{}, command] : [command, {}]; }
function step(m, count, commands = [{}, {}]) { for (let i = 0; i < count; i++) tick(m, commands, dt); }

test('a connected throw lifts, hurls, knocks down and recovers all six fighters in either direction', () => {
  for (const { id } of ROSTER) for (const side of [0, 1]) {
    const m = fight(id, side), attacker = m.fighters[side], victim = m.fighters[1 - side];
    tick(m, input(side, { throw: true }), dt);
    while (victim.hp === 100 && m.elapsed < .4) tick(m, [{}, {}], dt);
    assert.equal(victim.thrown?.phase, 'held', `${id} P${side + 1}: grab connects`);
    const damage = 100 - victim.hp, startX = victim.x;
    let lifted = false, airborne = false, down = false, impactCount = 0;
    for (let i = 0; i < 180; i++) {
      tick(m, input(1 - side, { guard: true, jump: true, punch: true, dash: true, right: true }), dt);
      lifted ||= victim.thrown?.phase === 'held' && victim.y < -40;
      airborne ||= victim.thrown?.phase === 'air' && victim.y < -100 && (victim.x - startX) * (side ? -1 : 1) > 30;
      if (victim.thrown?.phase === 'down') { down = true; assert.equal(victim.y, 0); assert.equal(celFor(victim), 32); }
      if (victim.thrown) { assert.equal(victim.attack, null); assert.equal(victim.guard, false); }
      impactCount += m.events.filter(e => e.type === 'throw').length;
      if (down && !victim.thrown) break;
    }
    assert.ok(lifted && airborne && down, `${id}: lift, flight, landing must all occur`);
    assert.equal(impactCount, 1); assert.equal(100 - victim.hp, damage);
    assert.ok(Math.abs(damage - 14 * attacker.power) < 1e-8);
    assert.equal(victim.thrown, null); assert.equal(victim.y, 0); assert.equal(victim.vy, 0);
    assert.equal(victim.buffer, null, 'mashing while thrown cannot queue an escape attack');
  }
});

function until(m, predicate, limit = 240) {
  for (let i = 0; i < limit && !predicate(); i++) tick(m, [{}, {}], dt);
  assert.ok(predicate(), 'expected throw transition');
}
function grab(m, side = 0) {
  tick(m, input(side, { throw: true }), dt);
  until(m, () => m.fighters[1 - side].thrown?.phase === 'held');
}

test('throws stay within both stage edges, miss out-of-range or stunned opponents, and beat guard', () => {
  for (const side of [0, 1]) {
    const m = fight('mickey', side, true); grab(m, side);
    for (let i = 0; i < 200; i++) {
      tick(m, [{}, {}], dt);
      for (const f of m.fighters) { assert.ok(f.x >= 60 && f.x <= 1140); assert.ok(Number.isFinite(f.x + f.y + f.vy)); assert.ok(f.y <= 0); }
    }
    assert.equal(m.fighters[1 - side].thrown, null);
  }
  for (const reason of ['range', 'stun', 'jump']) {
    const m = fight();
    if (reason === 'range') m.fighters[1].x = 900;
    if (reason === 'stun') m.fighters[1].hurt = .5;
    if (reason === 'jump') { m.fighters[1].y = -120; m.fighters[1].vy = -200; }
    tick(m, [{ throw: true }, {}], dt); step(m, 85);
    assert.equal(m.fighters[1].hp, 100, reason); assert.equal(m.fighters[1].thrown, null, reason);
  }
  const guarded = fight(); tick(guarded, [{ throw: true }, { guard: true }], dt);
  until(guarded, () => !!guarded.fighters[1].thrown);
  assert.equal(guarded.fighters[1].hp, 86); assert.equal(guarded.fighters[1].guard, false);
});

test('interrupting a grab or trading simultaneous throws cannot leave a fighter attached', () => {
  const m = fight(); grab(m);
  until(m, () => m.hitstop === 0);
  m.projectiles.push({ x: m.fighters[0].x, y: -95, direction: -1, owner: 1, kind: 'mickey', life: 1 });
  tick(m, [{}, {}], dt); assert.ok(m.fighters[0].hurt > 0);
  until(m, () => !m.fighters[1].thrown);
  assert.equal(m.fighters[1].y, 0); assert.equal(m.fighters[1].vy, 0);
  const killed = fight(); grab(killed); until(killed, () => killed.fighters[1].thrown.phase === 'air');
  killed.fighters[0].hp = 1;
  killed.projectiles.push({ x: killed.fighters[0].x, y: -95, direction: -1, owner: 1, kind: 'mickey', life: 1 });
  tick(killed, [{}, {}], dt); const deadX = killed.fighters[0].x;
  assert.equal(killed.fighters[0].hp, 0);
  for (let i = 0; i < 150 && killed.phase === 'fight'; i++) {
    tick(killed, [{ right: true, punch: true, jump: true, guard: true }, {}], dt);
    assert.equal(killed.fighters[0].x, deadX); assert.equal(killed.fighters[0].attack, null); assert.equal(killed.fighters[0].guard, false);
  }
  assert.equal(killed.phase, 'roundover'); assert.equal(killed.fighters[1].wins, 1);
  const trade = fight(); tick(trade, [{ throw: true }, { throw: true }], dt); step(trade, 180);
  for (const f of trade.fighters) { assert.equal(f.hp, 86); assert.equal(f.thrown, null); assert.equal(f.y, 0); }
});

test('a lethal throw or timeout waits for impact, then awards the round once and resets cleanly', () => {
  for (const ending of ['ko', 'timeout']) {
    const m = fight(); if (ending === 'ko') m.fighters[1].hp = 10; else m.time = .16;
    grab(m);
    until(m, () => m.fighters[1].thrown.phase === 'air');
    assert.equal(m.phase, 'fight'); assert.equal(m.fighters[0].wins, 0);
    until(m, () => m.phase === 'roundover');
    assert.equal(m.fighters[1].thrown.phase, 'down'); assert.equal(m.fighters[1].y, 0);
    assert.equal(m.fighters[0].wins, 1); assert.ok(m.events.some(e => e.type === 'throw'));
    assert.equal(celFor(m.fighters[1], { defeatTime: .1 }), 32);
    step(m, 280); assert.equal(m.round, 2); assert.equal(m.fighters[0].wins, 1);
    for (const f of m.fighters) { assert.equal(f.thrown, null); assert.equal(f.y, 0); assert.equal(f.hp, 100); }
  }
});

test('Training recovery waits for the throw to finish, and reset clears every throw phase', () => {
  for (const phase of ['held', 'air', 'down']) {
    const m = createMatch('mickey', 'popeye', 'training'); m.fighters[1].x = 600;
    grab(m); until(m, () => m.fighters[1].thrown?.phase === phase);
    assert.equal(m.training.lastHit.kind, 'throw'); assert.equal(m.fighters[1].hp, 86);
    resetTraining(m);
    for (const f of m.fighters) { assert.equal(f.thrown, null); assert.equal(f.attack, null); assert.equal(f.y, 0); assert.equal(f.vy, 0); }
    assert.equal(m.training.lastHit, null);
  }
  const m = createMatch('mickey', 'popeye', 'training'); m.fighters[1].x = 600; grab(m);
  until(m, () => m.fighters[1].thrown.phase === 'down');
  step(m, 12); assert.equal(m.fighters[1].hp, 86);
  until(m, () => !m.fighters[1].thrown); assert.equal(m.fighters[1].hp, 100);
});

test('throw cels hold the lifting pose until release, tumble instead of jumping, and freeze with hitstop', () => {
  const f = { id: 'mickey', attack: { kind: 'throw', time: .25, connected: true } };
  assert.equal(celFor(f), 40); f.attack.time = .33; assert.equal(celFor(f), 41);
  f.attack.connected = false; f.attack.time = .25; assert.equal(celFor(f), 41);
  for (const reducedMotion of [false, true]) {
    assert.equal(celFor({ id: 'popeye', thrown: { phase: 'held', time: .1 } }, { reducedMotion }), 28);
    assert.equal(celFor({ id: 'popeye', thrown: { phase: 'air', time: .1 } }, { reducedMotion }), 29);
    assert.equal(celFor({ id: 'popeye', thrown: { phase: 'down', time: .1 } }, { reducedMotion }), 32);
  }
  const m = fight(); grab(m); const before = JSON.stringify(m.fighters[1]);
  tick(m, [{}, {}], dt); assert.equal(JSON.stringify(m.fighters[1]), before);
});
