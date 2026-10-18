import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROSTER, CPU_TACTICS, CPU_DIFFICULTIES, createMatch, cpuInput, trainingInput, resetTraining, tick } from '../engine.mjs';
import { seededRandom, simulateMatch, runMatchups } from '../scripts/simulate-matchups.mjs';

const dt = 1 / 120;
function fight(id = 'mickey', distance = 100, difficulty = 'normal') {
  const m = createMatch('mickey', id, 'local', difficulty); m.phase = 'fight';
  m.fighters[0].x = 500; m.fighters[1].x = 500 + distance; return m;
}
function decision(m, value = .1, index = 1) {
  cpuInput(m, dt, () => value, index); m.ai[index].clock = 0;
  return cpuInput(m, dt, () => value, index);
}

test('six CPU personalities use their own ranges, tools and approaches', () => {
  assert.deepEqual(Object.keys(CPU_TACTICS), ROSTER.map(f => f.id));
  assert.equal(new Set(Object.values(CPU_TACTICS).map(t => t.description)).size, 6);
  const mouse = fight('mickey', 350); assert.equal(decision(mouse).special, true);
  const dancer = fight('minnie', 210); assert.equal(decision(dancer).dash, true);
  const rabbit = fight('oswald', 130); rabbit.fighters[0].y = -50;
  assert.equal(decision(rabbit).special, true, 'uppercut responds to an observed airborne rival');
  const cat = fight('felix', 75); cat.fighters[1].meter = 0;
  const feint = decision(cat); assert.equal(feint.dash, true); assert.equal(feint.right, true);
  const singer = fight('betty', 180); assert.equal(decision(singer).right, true, 'Betty backs toward projectile spacing');
  const dry = fight('betty', 180); dry.fighters[1].meter = 0;
  assert.equal(decision(dry).left, true, 'Betty approaches when she cannot afford a projectile');
  const sailor = fight('popeye', 300); assert.equal(decision(sailor).special, true);
  const powered = fight('popeye', 300); powered.fighters[1].buff = 5;
  assert.notEqual(decision(powered).special, true, 'Popeye does not waste ink refreshing active spinach');
  const grab = fight('popeye', 80); assert.equal(decision(grab).throw, true);
});

test('every difficulty observes before acting, honors its reaction delay, and emits attack edges only once', () => {
  for (const difficulty of Object.keys(CPU_DIFFICULTIES)) {
    const m = fight('mickey', 90, difficulty);
    assert.deepEqual(cpuInput(m, dt, () => .1), {});
    let action, frames = 0;
    do { action = cpuInput(m, dt, () => .1); frames++; } while (!Object.values(action).some(Boolean) && frames < 100);
    assert.ok(Object.values(action).some(Boolean));
    assert.ok(frames * dt >= CPU_DIFFICULTIES[difficulty].reaction - dt, difficulty);
    assert.ok(['punch', 'kick', 'special', 'throw'].filter(key => action[key]).length <= 1);
    const held = cpuInput(m, dt, () => .1);
    for (const key of ['punch', 'kick', 'special', 'throw', 'jump', 'dash']) assert.ok(!held[key], `${difficulty}: ${key} is an edge`);
  }
});

test('decisions cannot read hidden input buffers and only react to a later public observation', () => {
  const a = fight('mickey', 90, 'hard'), b = fight('mickey', 90, 'hard');
  cpuInput(a, dt, () => .5); cpuInput(b, dt, () => .5);
  b.fighters[0].buffer = { kind: 'throw', life: .13 };
  assert.deepEqual(cpuInput(a, dt, () => .5), cpuInput(b, dt, () => .5));
  a.fighters[0].attack = { kind: 'punch', time: 0 };
  a.ai[1].clock = 0;
  assert.notEqual(cpuInput(a, dt, () => .5).guard, true, 'a newly started attack is not known yet');
  a.ai[1].clock = 0;
  assert.equal(cpuInput(a, dt, () => .5).guard, true);
});

test('both CPU sides evade incoming projectiles, ignoring their own shots and shots moving away', () => {
  for (const index of [0, 1]) {
    const m = fight('mickey', 300);
    const x = m.fighters[index].x + (index ? -150 : 150), direction = index ? 1 : -1;
    m.projectiles.push({ x, y: -95, direction, owner: 1 - index });
    assert.equal(decision(m, .1, index).jump, true);
    for (const own of [true, false]) {
      const safe = fight('mickey', 300);
      safe.projectiles.push({ x, y: -95, direction: own ? direction : -direction, owner: own ? index : 1 - index });
      assert.notEqual(decision(safe, .1, index).jump, true);
    }
  }
});

test('CPU clocks and decisions freeze through hitstop/countdown; reset clears both brains', () => {
  const m = fight(); cpuInput(m, dt, () => .1, 0); cpuInput(m, dt, () => .1, 1);
  const before = structuredClone(m.ai); m.hitstop = .04;
  assert.deepEqual(cpuInput(m, dt), {}); assert.deepEqual(m.ai, before);
  m.hitstop = 0; m.phase = 'countdown'; assert.deepEqual(cpuInput(m, dt), {}); assert.deepEqual(m.ai, before);
  m.phase = 'fight'; m.time = 0; m.fighters[1].hp = 90; tick(m, [{}, {}], dt);
  for (let i = 0; i < 280; i++) tick(m, [{}, {}], dt);
  assert.ok(m.ai.every(ai => !ai.observed && !ai.confirmed));
  const training = createMatch('mickey', 'minnie', 'training'); training.training.dummy = 'cpu';
  cpuInput(training, dt); resetTraining(training); assert.ok(training.ai.every(ai => !ai.observed));
});

test('both CPUs retain guard throughout block recoil when their decision timer expires, then can release it', () => {
  for (const index of [0, 1]) for (const clock of [0, .05]) {
    const m = fight('mickey', 90, 'hard'), self = m.fighters[index], foe = m.fighters[1 - index];
    const inputs = [{}, {}]; inputs[index] = { guard: true }; inputs[1 - index] = { punch: true };
    tick(m, inputs, dt); inputs[1 - index] = {};
    for (let i = 0; i < 30 && !m.hitstop; i++) tick(m, inputs, dt);
    assert.equal(self.reaction, 'block'); assert.ok(self.hurt > 0);
    while (m.hitstop > 0) tick(m, inputs, dt);
    m.ai[index] = { clock, action: { guard: true }, observed: { x: foe.x, y: 0, hurt: 0, cooldown: 0, guard: false, attack: null } };
    while (self.hurt > 0) {
      const commands = cpuInput(m, dt, () => .99, index);
      assert.equal(commands.guard, true, `P${index + 1} must hold guard throughout block recoil`);
      assert.ok(!['punch', 'kick', 'special', 'throw', 'dash', 'jump'].some(key => commands[key]));
      inputs[index] = commands; tick(m, inputs, dt); assert.equal(self.guard, true);
    }
    m.ai[index].clock = 0;
    assert.notEqual(cpuInput(m, dt, () => .99, index).guard, true, 'ordinary decisions resume after block recoil');
    self.hurt = .1; self.reaction = 'hurt'; m.ai[index].clock = 0;
    assert.deepEqual(cpuInput(m, dt, () => .99, index), {}, 'damage recoil does not acquire automatic guard');
  }
});

test('own-hit confirms create real combos; whiffs and blocks do not grant a cancel', () => {
  for (const guard of [false, true]) {
    const m = fight('minnie', 90, 'hard'); let combo = false, cancelledBlock = false;
    for (let i = 0; i < 600; i++) {
      tick(m, [{ guard }, cpuInput(m, dt, () => .8)], dt);
      combo ||= m.fighters[1].combo >= 2;
      cancelledBlock ||= guard && m.events.some(event => event.type === 'swing' && event.cancel);
    }
    if (!guard) assert.ok(combo, 'Minnie confirms into an actual multi-hit string');
    assert.equal(cancelledBlock, false);
  }
});

test('Training CPU stays Normal and difficulties never change fighters or move damage', () => {
  const snapshots = [];
  for (const difficulty of Object.keys(CPU_DIFFICULTIES)) {
    const m = createMatch('mickey', 'popeye', 'training', difficulty); m.training.dummy = 'cpu';
    trainingInput(m, dt, () => .5); snapshots.push([m.fighters, m.ai[1].clock]);
  }
  for (const snapshot of snapshots) assert.deepEqual(snapshot, snapshots[0]);
});

test('seeded matches are reproducible, independent per side, and Hard outplays Easy in mirror probes', () => {
  const result = simulateMatch('minnie', 'betty', { seed: 1900 });
  assert.deepEqual(simulateMatch('minnie', 'betty', { seed: 1900 }), result); assert.equal(result.complete, true);
  let hardWins = 0, easyWins = 0;
  for (const { id } of ROSTER) for (let seed = 1930; seed < 1934; seed++) for (const side of [0, 1]) {
    const m = simulateMatch(id, id, { seed, difficulty: side ? 'easy' : 'hard', rivalDifficulty: side ? 'hard' : 'easy' });
    assert.equal(m.complete, true);
    if (m.winner === side) hardWins++; else if (m.winner !== null) easyWins++;
  }
  assert.ok(hardWins > easyWins, `Hard ${hardWins}, Easy ${easyWins}`);
});

test('matchup reports cover all 36 ordered pairs at each level, with stable summaries', () => {
  const report = runMatchups({ seeds: 1 }); assert.equal(report.matches.length, 108);
  assert.equal(report.calibration.length, 3); assert.ok(report.calibration.every(c => c.matches.length === 12 && c.incomplete === 0));
  for (const row of report.summary) {
    const matches = report.matches.filter(m => m.difficulty[0] === row.difficulty);
    assert.equal(new Set(matches.map(m => m.fighters.join('/'))).size, 36);
    assert.equal(matches.filter(m => m.fighters[0] === m.fighters[1]).length, 6);
    assert.equal(row.incomplete, 0); assert.equal(row.sideWins[0] + row.sideWins[1], 36);
    assert.ok(row.fighters.every(f => f.games === 12));
  }
  const sample = seededRandom(1930); assert.notEqual(sample(), sample());
  for (const bad of [{ seeds: 0 }, { seeds: 101 }, { seed: NaN }, { seed: 4294967295, seeds: 2 }, { difficulty: 'constructor' }]) assert.throws(() => runMatchups(bad));
  assert.throws(() => simulateMatch('mickey', 'popeye', { rivalDifficulty: 'impossible' }));
  assert.throws(() => simulateMatch('mickey', 'popeye', { seed: -1 }));
});

test('the balance CLI writes a versioned JSON artifact and rejects invalid arguments', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'pdcf-balance-')); t.after(() => rm(directory, { recursive: true, force: true }));
  const file = join(directory, 'nested/report.json'), script = fileURLToPath(new URL('../scripts/simulate-matchups.mjs', import.meta.url));
  execFileSync(process.execPath, [script, '--seeds', '1', '--seed', '1930', '--difficulty', 'normal', '--json', file], { stdio: 'pipe' });
  const report = JSON.parse(await readFile(file, 'utf8'));
  assert.equal(report.version, 1); assert.equal(report.matches.length, 36); assert.equal(report.seed, 1930);
  assert.equal(report.calibration.length, 0); assert.ok(report.build?.commit.match(/^[a-f0-9]{40}$/));
  for (const args of [['--seeds', '0'], ['--difficulty', 'constructor'], ['--unknown', '1'], ['--json']]) assert.throws(() => execFileSync(process.execPath, [script, ...args], { stdio: 'pipe' }));
});
