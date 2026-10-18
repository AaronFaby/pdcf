import test from 'node:test';
import assert from 'node:assert/strict';
import { ROSTER, CPU_DIFFICULTIES, createMatch, cpuInput, tick } from '../engine.mjs';
import { ENDINGS, createArcade, arcadeMatch, finishArcade, restoreArcade } from '../assets/runtime/arcade.mjs';
import { seededRandom } from '../scripts/simulate-matchups.mjs';

function finish(match, winner = 0) {
  // Resolve two actual timeout rounds without relying on random combat outcomes.
  for (let i = 0; i < 500 && match.phase !== 'matchover'; i++) {
    if (match.phase === 'fight') {
      match.time = 0;
      match.fighters[winner].hp = 100; match.fighters[1 - winner].hp = 10;
    }
    tick(match, [{}, {}], .05);
  }
  assert.equal(match.phase, 'matchover'); assert.equal(match.fighters[winner].wins, 2);
}

test('each star gets all five other rivals and their own mirror finale', () => {
  for (const { id } of ROSTER) for (const difficulty of Object.keys(CPU_DIFFICULTIES)) {
    const run = createArcade(id, difficulty, () => .3);
    assert.equal(new Set(run.ladder).size, 6); assert.equal(run.ladder[5], id);
    assert.deepEqual([...run.ladder].sort(), ROSTER.map(f => f.id).sort());
    assert.equal(run.index, 0); assert.equal(run.difficulty, difficulty);
  }
  assert.throws(() => createArcade('flip'), /fighter/);
  assert.throws(() => createArcade('mickey', 'impossible'), /difficulty/);
});

test('every character can clear six best-of-three bouts and reach their own ending', () => {
  const titles = new Set();
  for (const { id } of ROSTER) {
    const run = createArcade(id, 'hard', () => .4);
    for (let i = 0; i < 6; i++) {
      const match = arcadeMatch(run);
      assert.equal(match.arcadeStage, i); assert.equal(match.fighters[1].id, run.ladder[i]);
      assert.equal(match.difficulty, 'hard'); assert.equal(match.fighters[0].hp, 100);
      assert.equal(match.fighters[0].meter, 35); assert.equal(match.fighters[0].wins, 0);
      assert.equal(finishArcade(run, match), false, 'an unfinished fight cannot advance');
      finish(match); assert.equal(finishArcade(run, match), true);
      assert.equal(run.index, i + 1); assert.equal(finishArcade(run, match), false, 'results apply only once');
    }
    assert.equal(run.status, 'complete'); assert.equal(arcadeMatch(run), null);
    assert.equal(run.losses, 0); assert.equal(run.attempts, 6);
    assert.equal(ENDINGS[id].story.length, 2); assert.ok(ENDINGS[id].closing.length > 20);
    titles.add(ENDINGS[id].title);
    assert.deepEqual(restoreArcade(JSON.parse(JSON.stringify(run))), run);
  }
  assert.equal(titles.size, 6);
});

test('continues keep cleared bouts, reset combat, and reject stale match results', () => {
  const run = createArcade('betty', 'easy', () => .7);
  const first = arcadeMatch(run); assert.equal(arcadeMatch(run), null);
  finish(first); finishArcade(run, first);
  const lost = arcadeMatch(run), opponent = lost.fighters[1].id;
  finish(lost, 1); finishArcade(run, lost);
  assert.equal(run.index, 1); assert.equal(run.losses, 1); assert.equal(run.status, 'lost');
  const retry = arcadeMatch(run);
  assert.equal(retry.fighters[1].id, opponent); assert.equal(retry.fighters[0].hp, 100);
  assert.equal(retry.round, 1); assert.equal(retry.projectiles.length, 0);
  assert.equal(finishArcade(run, lost), false); assert.equal(run.status, 'fighting');
  finish(retry); assert.equal(finishArcade(run, retry), true); assert.equal(run.index, 2);
});

test('checkpoint restoration restarts an interrupted bout and rejects corrupt or incompatible data', () => {
  const run = createArcade('felix', 'normal', () => .5); arcadeMatch(run);
  const saved = JSON.parse(JSON.stringify(run)), restored = restoreArcade(saved);
  assert.equal(restored.status, 'ready'); assert.equal(restored.index, 0); assert.equal(restored.attempts, 1);
  const match = arcadeMatch(restored); assert.equal(match.arcadeAttempt, 2);
  assert.equal(match.phase, 'countdown'); assert.equal(match.fighters[0].hp, 100);
  for (const bad of [null, {}, { ...saved, version: 9 }, { ...saved, difficulty: 'constructor' }, { ...saved, index: 7 }, { ...saved, index: NaN }, { ...saved, losses: -1 }, { ...saved, attempts: Infinity }, { ...saved, status: 'complete' }, { ...saved, ladder: Array(6).fill('felix') }, { ...saved, ladder: [...saved.ladder].reverse() }]) assert.equal(restoreArcade(bad), null);
  for (const bad of [{ ...saved, status: 'lost', losses: 0 }, { ...saved, index: 2, losses: 1, attempts: 2 }, { ...saved, status: 'ready', index: 6, attempts: 6 }, { ...saved, ladder: [saved.ladder[5], ...saved.ladder.slice(1, 5), saved.ladder[0]] }]) assert.equal(restoreArcade(bad), null);
  saved.ladder[0] = 'flip'; assert.notEqual(restored.ladder[0], 'flip', 'restored data does not share the input array');
});

test('difficulty changes CPU reactions and decisions without changing health or damage', () => {
  const easy = createMatch('mickey', 'popeye', 'cpu', 'easy');
  const hard = createMatch('mickey', 'popeye', 'cpu', 'hard');
  for (const m of [easy, hard]) {
    m.phase = 'fight'; m.fighters[0].x = 500; m.fighters[1].x = 580; m.fighters[0].attack = { kind: 'punch', time: 0 };
  }
  const soft = cpuInput(easy, 1 / 120, () => .5), tough = cpuInput(hard, 1 / 120, () => .5);
  assert.ok(hard.ai[1].clock < easy.ai[1].clock); assert.deepEqual(soft, {}); assert.deepEqual(tough, {}, 'both levels must observe before reacting');
  let softGuard = false, hardGuard = false;
  for (let i = 0; i < 60; i++) { softGuard ||= !!cpuInput(easy, 1 / 120, () => .5).guard; hardGuard ||= !!cpuInput(hard, 1 / 120, () => .5).guard; }
  assert.equal(softGuard, false); assert.equal(hardGuard, true);
  assert.deepEqual(easy.fighters.map(f => [f.hp, f.power, f.speed]), hard.fighters.map(f => [f.hp, f.power, f.speed]));
  assert.equal(createMatch('mickey', 'popeye', 'cpu', 'invalid').difficulty, 'normal');
  const finale = createMatch('mickey', 'popeye', 'arcade', 'hard'); finale.arcadeStage = 5; finale.phase = 'fight';
  hard.ai[1].clock = 0;
  cpuInput(hard, 1 / 120, () => .5);
  cpuInput(finale, 1 / 120, () => .5); assert.ok(finale.ai[1].clock < hard.ai[1].clock);
});

test('real combat can complete CPU matches at each difficulty without invalid state', () => {
  for (const difficulty of Object.keys(CPU_DIFFICULTIES)) {
    const match = createMatch('mickey', 'popeye', 'cpu', difficulty);
    const random = seededRandom(1930);
    let cpuDamage = false;
    for (let frame = 0; frame < 120 * 205 && match.phase !== 'matchover'; frame++) {
      const player = { right: match.fighters[0].x < match.fighters[1].x - 90, left: match.fighters[0].x > match.fighters[1].x + 90, punch: frame % 53 === 0, kick: frame % 79 === 0, special: frame % 241 === 0 };
      tick(match, [player, cpuInput(match, 1 / 120, random)], 1 / 120);
      cpuDamage ||= match.fighters[0].hp < 100;
      assert.ok(match.fighters.every(f => Number.isFinite(f.x) && Number.isFinite(f.hp) && f.hp >= 0 && f.meter >= 0 && f.meter <= 100));
    }
    assert.equal(match.phase, 'matchover', difficulty); assert.ok(cpuDamage, `${difficulty}: CPU landed damage`);
  }
});
