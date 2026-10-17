import test from 'node:test';
import assert from 'node:assert/strict';
import { ROSTER, createMatch, tick, cpuInput, SPECIAL_COST } from '../engine.mjs';

function fight(a = 'mickey', b = 'popeye') { const m = createMatch(a, b); m.phase = 'fight'; m.fighters[0].x = 500; m.fighters[1].x = 600; return m; }
function step(m, seconds, inputs = [{}, {}]) { for (let i = 0; i < Math.ceil(seconds * 120); i++) tick(m, inputs, 1 / 120); }

test('the six requested fighters include Popeye and exclude Flip', () => {
  assert.deepEqual(ROSTER.map(f => f.id), ['mickey', 'minnie', 'oswald', 'felix', 'betty', 'popeye']);
  assert.throws(() => createMatch('flip'), /Unknown fighter/);
});
test('one punch hits only once and needs proximity', () => {
  const m = fight();
  tick(m, [{ punch: true }, {}], 1 / 120); step(m, .35);
  assert.equal(m.fighters[1].hp, 92);
  step(m, 1); assert.equal(m.fighters[1].hp, 92);
  m.fighters[1].x = 1000;
  tick(m, [{ punch: true }, {}], 1 / 120); step(m, .35);
  assert.equal(m.fighters[1].hp, 92);
});
test('guard reduces damage and earns ink', () => {
  const m = fight(); const meter = m.fighters[1].meter;
  tick(m, [{ punch: true }, { guard: true }], 1 / 120);
  step(m, .3, [{}, { guard: true }]);
  assert.equal(m.fighters[1].hp, 98.8);
  assert.ok(m.fighters[1].meter > meter);
});
test('jumping clears a grounded attack and lands back on the pier', () => {
  const m = fight();
  tick(m, [{}, { jump: true }], 1 / 120); step(m, .14);
  tick(m, [{ kick: true }, {}], 1 / 120); step(m, .3);
  assert.equal(m.fighters[1].hp, 100);
  step(m, 1); assert.equal(m.fighters[1].y, 0); assert.equal(m.fighters[1].vy, 0);
});
test('Popeye spends ink, heals within cap, and gains a temporary damage boost', () => {
  const m = fight('popeye', 'mickey'); m.fighters[0].hp = 95;
  tick(m, [{ special: true }, {}], 1 / 120); step(m, .8);
  assert.equal(m.fighters[0].meter, 0); assert.equal(m.fighters[0].hp, 100); assert.ok(m.fighters[0].buff > 5);
  tick(m, [{ punch: true }, {}], 1 / 120); step(m, .4);
  assert.ok(m.fighters[1].hp < 86);
  step(m, 6); assert.equal(m.fighters[0].buff, 0);
});
test('specials require sufficient ink and ranged attacks expire after one hit', () => {
  const m = fight('felix', 'mickey'); m.fighters[0].meter = SPECIAL_COST - 1;
  tick(m, [{ special: true }, {}], 1 / 120); assert.equal(m.fighters[0].attack, null);
  m.fighters[0].meter = SPECIAL_COST; m.fighters[1].x = 850;
  tick(m, [{ special: true }, {}], 1 / 120); step(m, 1.2);
  assert.ok(m.fighters[1].hp < 100); assert.equal(m.projectiles.length, 0);
  const hp = m.fighters[1].hp; step(m, 2); assert.equal(m.fighters[1].hp, hp);
});
test('same-frame hits trade, and double knockout does not award a winner', () => {
  const m = fight('mickey', 'mickey'); m.fighters.forEach(f => f.hp = 8);
  tick(m, [{ punch: true }, { punch: true }], 1 / 120); step(m, .2);
  assert.equal(m.fighters[0].hp, 0); assert.equal(m.fighters[1].hp, 0);
  assert.equal(m.roundWinner, null); assert.equal(m.phase, 'roundover');
});
test('countdown locks movement, attacks and the clock', () => {
  const m = createMatch(); step(m, 1, [{ right: true, punch: true }, {}]);
  assert.equal(m.fighters[0].x, 340); assert.equal(m.fighters[0].attack, null); assert.equal(m.time, 60);
  step(m, 1.5); assert.equal(m.phase, 'fight');
});
test('timeouts compare health, reset rounds, and end after two wins', () => {
  const m = fight(); m.time = .01; m.fighters[1].hp = 90;
  step(m, .05); assert.equal(m.roundWinner, 0); assert.equal(m.fighters[0].wins, 1);
  step(m, 2.3); assert.equal(m.phase, 'countdown'); assert.equal(m.round, 2);
  assert.equal(m.fighters[1].hp, 100); step(m, 2.5);
  m.time = .01; m.fighters[1].hp = 90;
  step(m, 2.4); assert.equal(m.phase, 'matchover'); assert.equal(m.winner, 0);
  assert.equal(m.fighters[0].wins, 2);
});
test('fighters stay inside the stage and cannot walk through each other', () => {
  const m = fight(); step(m, 3, [{ right: true }, { left: true }]);
  assert.ok(m.fighters[1].x - m.fighters[0].x >= 74.99);
  step(m, 8, [{ left: true }, { right: true }]);
  assert.equal(m.fighters[0].x, 60); assert.equal(m.fighters[1].x, 1140);
});
test('every fighter can complete a CPU match without invalid state', () => {
  for (const f of ROSTER) {
    const m = createMatch(f.id, 'popeye');
    for (let frame = 0; frame < 120 * 205 && m.phase !== 'matchover'; frame++) {
      const p1 = { right: m.fighters[0].x < m.fighters[1].x - 90, left: m.fighters[0].x > m.fighters[1].x + 90, punch: frame % 53 === 0, kick: frame % 79 === 0, special: frame % 241 === 0 };
      tick(m, [p1, cpuInput(m, 1 / 120, () => .3)], 1 / 120);
      assert.ok(m.fighters.every(p => Number.isFinite(p.x) && Number.isFinite(p.hp) && p.hp >= 0 && p.meter >= 0 && p.meter <= 100));
    }
    assert.equal(m.phase, 'matchover', f.id + ' match completes');
  }
});
