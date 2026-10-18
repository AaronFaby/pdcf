// Browser-flow fixture only. Production imports engine.mjs directly.
export * from '../../engine.mjs';
import { tick as combatTick } from '../../engine.mjs';

export function tick(match, inputs, dt) {
  const key = match.mode === 'arcade' ? 'arcadeTestResult' : 'cpuTestResult';
  const winner = window.parent[key];
  if ([0, 1].includes(winner) && match.phase !== 'matchover') {
    window.parent[key] = null;
    // Script timeout outcomes; the real engine still awards rounds and resolves the match.
    for (let i = 0; i < 500 && match.phase !== 'matchover'; i++) {
      if (match.phase === 'fight') {
        match.time = 0;
        match.fighters[winner].hp = 100; match.fighters[1 - winner].hp = 10;
      }
      combatTick(match, [{}, {}], .05);
    }
    return;
  }
  combatTick(match, inputs, dt);
}
