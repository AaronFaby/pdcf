import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ROSTER, CPU_DIFFICULTIES, createMatch, cpuInput, tick } from '../engine.mjs';

export function seededRandom(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}

export function simulateMatch(a, b, { seed = 1930, difficulty = 'normal', rivalDifficulty = difficulty } = {}) {
  for (const level of [difficulty, rivalDifficulty]) if (!Object.hasOwn(CPU_DIFFICULTIES, level)) throw new Error('Unknown difficulty');
  if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295) throw new Error('Seed must be an unsigned 32-bit integer');
  const match = createMatch(a, b, 'local', difficulty), dt = 1 / 120;
  const levels = [difficulty, rivalDifficulty];
  // Keep each fighter's stream when sides swap; mirrors need two distinct streams.
  const random = [a, b].map((id, i) => seededRandom(seed + (ROSTER.findIndex(f => f.id === id) + 1) * 65537 + (a === b ? i * 8191 : 0)));
  const stats = [0, 1].map(() => ({ damage: 0, blocks: 0, jumps: 0, dashes: 0, maxCombo: 0, attacks: { punch: 0, kick: 0, special: 0, throw: 0 } }));
  let frames = 0, timeouts = 0, draws = 0;
  for (; frames < 120 * 240 && match.phase !== 'matchover'; frames++) {
    const phase = match.phase;
    tick(match, [0, 1].map(i => cpuInput(match, dt, random[i], i, levels[i])), dt);
    for (const event of match.events) {
      const stat = stats[event.index];
      if (event.type === 'swing') stat.attacks[event.kind]++;
      if (event.type === 'jump') stat.jumps++;
      if (event.type === 'dash') stat.dashes++;
      if (event.type === 'hit' || event.type === 'block') {
        stat.damage += event.damage;
        stat.maxCombo = Math.max(stat.maxCombo, event.hits || 0);
        if (event.type === 'block') stats[1 - event.index].blocks++;
      }
    }
    if (phase === 'fight' && match.phase === 'roundover') {
      if (match.roundEndReason === 'timeout') timeouts++;
      if (match.roundWinner === null) draws++;
    }
    for (const f of match.fighters) {
      if (![f.x, f.y, f.vx, f.vy, f.hp, f.meter].every(Number.isFinite) || f.hp < 0 || f.hp > 100 || f.meter < 0 || f.meter > 100 || f.x < 60 || f.x > 1140) throw new Error(`Invalid combat state: ${a} vs ${b}, seed ${seed}`);
    }
  }
  return { fighters: [a, b], difficulty: levels, seed, complete: match.phase === 'matchover', winner: match.winner, rounds: match.round, seconds: Number((frames * dt).toFixed(3)), timeouts, draws, stats };
}

export function runMatchups({ seeds = 2, seed = 1930, difficulty = 'all' } = {}) {
  if (!Number.isInteger(seeds) || seeds < 1 || seeds > 100) throw new Error('Seeds must be between 1 and 100');
  if (!Number.isInteger(seed) || seed < 0 || seed + seeds - 1 > 4294967295) throw new Error('Seed range must fit unsigned 32-bit integers');
  const levels = difficulty === 'all' ? Object.keys(CPU_DIFFICULTIES) : [difficulty];
  if (levels.some(level => !Object.hasOwn(CPU_DIFFICULTIES, level))) throw new Error('Unknown difficulty');
  const matches = [];
  for (const level of levels) for (let n = 0; n < seeds; n++) for (const a of ROSTER) for (const b of ROSTER) matches.push(simulateMatch(a.id, b.id, { seed: seed + n, difficulty: level }));
  const summary = levels.map(level => {
    const bouts = matches.filter(m => m.difficulty[0] === level);
    return {
      difficulty: level, matches: bouts.length, incomplete: bouts.filter(m => !m.complete).length,
      sideWins: [0, 1].map(i => bouts.filter(m => m.winner === i).length),
      timeoutRounds: bouts.reduce((n, m) => n + m.timeouts, 0), rounds: bouts.reduce((n, m) => n + m.rounds, 0),
      fighters: ROSTER.map(({ id }) => {
        let wins = 0, games = 0, damage = 0;
        for (const match of bouts) for (const [i, fighter] of match.fighters.entries()) if (fighter === id) {
          games++; damage += match.stats[i].damage; if (match.winner === i) wins++;
        }
        return { id, games, wins, winRate: Number((wins / games).toFixed(3)), damage: Number((damage / games).toFixed(2)) };
      })
    };
  });
  const calibration = [];
  if (difficulty === 'all') for (const [stronger, weaker] of [['normal', 'easy'], ['hard', 'normal'], ['hard', 'easy']]) {
    const probes = [];
    for (let n = 0; n < seeds; n++) for (const { id } of ROSTER) for (const side of [0, 1]) {
      const match = simulateMatch(id, id, { seed: seed + n, difficulty: side ? weaker : stronger, rivalDifficulty: side ? stronger : weaker });
      probes.push({ ...match, strongerSide: side });
    }
    calibration.push({ stronger, weaker, strongerWins: probes.filter(m => m.winner === m.strongerSide).length, weakerWins: probes.filter(m => m.winner !== null && m.winner !== m.strongerSide).length, incomplete: probes.filter(m => !m.complete).length, matches: probes });
  }
  return { version: 1, seed, seeds, summary, matches, calibration };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const options = {}, args = process.argv.slice(2); let json;
  try {
    for (let i = 0; i < args.length; i += 2) {
      const key = args[i], value = args[i + 1];
      if (!['--seeds', '--seed', '--difficulty', '--json'].includes(key) || !value) throw new Error('Usage: npm run balance -- [--seeds 2] [--seed 1930] [--difficulty all|easy|normal|hard] [--json work/balance.json]');
      if (key === '--json') json = value;
      else options[key.slice(2)] = ['--seed', '--seeds'].includes(key) ? Number(value) : value;
    }
    const report = runMatchups(options);
    try {
      const git = { cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] };
      report.build = { commit: execFileSync('git', ['rev-parse', 'HEAD'], git).trim(), modified: !!execFileSync('git', ['status', '--porcelain'], git).trim() };
    } catch { report.build = null; }
    if (json) { await mkdir(dirname(json), { recursive: true }); await writeFile(json, JSON.stringify(report, null, 2) + '\n'); }
    for (const row of report.summary) {
      console.log(`${row.difficulty}: ${row.matches} matches; side wins ${row.sideWins.join(' / ')}; ${row.timeoutRounds}/${row.rounds} timeout rounds; ${row.incomplete} incomplete`);
      console.table(row.fighters.map(f => ({ fighter: f.id, games: f.games, 'win %': (f.winRate * 100).toFixed(1), 'damage / match': f.damage })));
    }
    for (const probe of report.calibration) console.log(`${probe.stronger} vs ${probe.weaker}: ${probe.strongerWins} / ${probe.weakerWins} wins, ${probe.incomplete} incomplete (${probe.matches.length} mirror probes)`);
    console.log('Diagnostic CPU results, not human matchup ratings. Both sides and all six mirrors are included.');
    if (report.summary.some(row => row.incomplete) || report.calibration.some(row => row.incomplete)) process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
