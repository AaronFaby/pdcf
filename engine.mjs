export const ROSTER = [
  { id: 'mickey', name: 'Mickey Mouse', short: 'Mickey', year: '1928', title: 'The headliner', style: 'ALL-ROUNDER', speed: 278, power: 1, reach: 114, special: 'Steamboat blast', quote: 'A little mouse. A big right hook.' },
  { id: 'minnie', name: 'Minnie Mouse', short: 'Minnie', year: '1928', title: 'The showstopper', style: 'SPEED', speed: 325, power: .86, reach: 105, special: 'Charleston rush', quote: 'Light on her feet. Heavy on the hits.' },
  { id: 'oswald', name: 'Oswald', short: 'Oswald', year: '1927', title: 'The lucky one', style: 'REACH', speed: 288, power: .96, reach: 147, special: 'Lucky uppercut', quote: 'Long ears. Longer winning streak.' },
  { id: 'felix', name: 'Felix the Cat', short: 'Felix', year: '1919', title: 'The wild card', style: 'TRICKSTER', speed: 292, power: .93, reach: 120, special: 'Ink blot', quote: 'Every trick in the inkwell.' },
  { id: 'betty', name: 'Betty Boop', short: 'Betty', year: '1930', title: 'The knockout', style: 'RANGED', speed: 285, power: .95, reach: 110, special: 'Boop blast', quote: 'Her next number is a knockout.' },
  { id: 'popeye', name: 'Popeye', short: 'Popeye', year: '1929', title: 'The heavyweight', style: 'POWER', speed: 244, power: 1.22, reach: 126, special: 'Spinach power', quote: 'Strong to the finish.' }
];

export const WIDTH = 1200;
export const FLOOR = 545;
export const SPECIAL_COST = 35;
export const MOVES = {
  punch: { duration: .32, active: .09, until: .18, damage: 8, reach: 0, height: 85, push: 26 },
  kick: { duration: .48, active: .17, until: .29, damage: 12, reach: 25, height: 60, push: 48 },
  special: { duration: .65, active: .22, until: .38, damage: 19, reach: 60, height: 100, push: 65 }
};

function fighter(id, index) {
  const spec = ROSTER.find(f => f.id === id);
  if (!spec) throw new Error('Unknown fighter: ' + id);
  return { ...spec, x: index ? 860 : 340, y: 0, vx: 0, vy: 0, face: index ? -1 : 1, hp: 100, meter: 35, wins: 0, attack: null, hurt: 0, cooldown: 0, guard: false, buff: 0, walk: 0 };
}

export function createMatch(a = 'mickey', b = 'popeye', mode = 'cpu') {
  return { fighters: [fighter(a, 0), fighter(b, 1)], mode, phase: 'countdown', phaseTime: 2.4, time: 60, round: 1, projectiles: [], effects: [], events: [], winner: null, roundWinner: null, elapsed: 0, ai: { clock: 0, action: {} } };
}

export function cpuInput(match, dt, random = Math.random) {
  const ai = match.ai;
  ai.clock -= dt;
  if (ai.clock > 0) return { ...ai.action, punch: false, kick: false, special: false, jump: false };
  ai.clock = .15 + random() * .17;
  const [enemy, self] = match.fighters;
  const distance = Math.abs(enemy.x - self.x);
  const close = distance < self.reach + 22;
  ai.action = {
    left: self.x > enemy.x && !close,
    right: self.x < enemy.x && !close,
    guard: enemy.attack !== null && distance < enemy.reach + 55 && random() < .64,
    jump: distance > 220 && random() < .12,
    punch: close && random() < .55,
    kick: close && random() < .48,
    special: self.meter >= SPECIAL_COST && distance < 460 && random() < .38
  };
  return ai.action;
}

function beginAttack(match, f, kind, index) {
  if (f.attack || f.hurt > 0 || f.cooldown > 0 || f.guard) return;
  if (kind === 'special') {
    if (f.meter < SPECIAL_COST) return;
    f.meter -= SPECIAL_COST;
  }
  f.attack = { kind, time: 0, hit: false, emitted: false, face: f.face };
  match.events.push({ type: 'swing', kind, index });
}

function hit(match, defender, attacker, damage, push, direction) {
  if (defender.hp <= 0) return;
  const blocked = defender.guard && defender.y === 0 && defender.hurt <= 0 && defender.face === -direction;
  const amount = blocked ? damage * .15 : damage;
  defender.hp = Math.max(0, defender.hp - amount);
  defender.hurt = blocked ? .1 : .25;
  if (!blocked) defender.attack = null;
  defender.x = Math.min(1140, Math.max(60, defender.x + direction * (blocked ? push * .3 : push)));
  defender.meter = Math.min(100, defender.meter + (blocked ? 5 : 9));
  attacker.meter = Math.min(100, attacker.meter + (blocked ? 3 : 7));
  match.effects.push({ x: defender.x - direction * 25, y: FLOOR + defender.y - 105, life: .28, max: .28, blocked, text: blocked ? 'CLINK!' : damage >= 17 ? 'POW!' : 'WHAM!' });
  match.events.push({ type: blocked ? 'block' : 'hit', heavy: damage >= 17 });
}

function resetRound(match) {
  match.fighters = match.fighters.map((f, i) => ({ ...fighter(f.id, i), wins: f.wins }));
  match.projectiles = [];
  match.effects = [];
  match.ai = { clock: .4, action: {} };
  match.phase = 'countdown';
  match.phaseTime = 2.4;
  match.time = 60;
  match.round++;
}

export function tick(match, inputs, dt) {
  if (!(dt > 0) || !Number.isFinite(dt)) return;
  dt = Math.min(dt, .05);
  match.events = [];
  if (match.phase === 'matchover') return;
  match.elapsed += dt;
  match.effects = match.effects.filter(e => (e.life -= dt) > 0);
  if (match.phase === 'countdown') {
    match.phaseTime -= dt;
    if (match.phaseTime <= 0) { match.phase = 'fight'; match.events.push({ type: 'bell' }); }
    return;
  }
  if (match.phase === 'roundover') {
    match.phaseTime -= dt;
    if (match.phaseTime <= 0) {
      const winner = match.fighters.findIndex(f => f.wins >= 2);
      if (winner >= 0) { match.phase = 'matchover'; match.winner = winner; }
      else resetRound(match);
    }
    return;
  }
  match.time = Math.max(0, match.time - dt);
  const commands = [inputs[0] || {}, inputs[1] || {}];
  for (let i = 0; i < 2; i++) {
    const f = match.fighters[i], other = match.fighters[1 - i], input = commands[i];
    f.face = other.x >= f.x ? 1 : -1;
    f.hurt = Math.max(0, f.hurt - dt);
    f.cooldown = Math.max(0, f.cooldown - dt);
    f.buff = Math.max(0, f.buff - dt);
    f.guard = !!input.guard && f.y === 0 && !f.attack && f.hurt <= 0;
    f.vx = 0;
    if (f.hurt <= 0 && !f.guard && !f.attack) {
      f.vx = ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * f.speed;
      if (input.jump && f.y === 0) f.vy = -665;
      if (input.special) beginAttack(match, f, 'special', i);
      else if (input.kick) beginAttack(match, f, 'kick', i);
      else if (input.punch) beginAttack(match, f, 'punch', i);
    }
    f.x = Math.min(1140, Math.max(60, f.x + f.vx * dt));
    f.walk += Math.abs(f.vx) * dt / 45;
    if (f.y < 0 || f.vy < 0) {
      f.vy += 1700 * dt;
      f.y += f.vy * dt;
      if (f.y >= 0) { f.y = 0; f.vy = 0; }
    }
  }
  const [a, b] = match.fighters;
  if (Math.abs(a.x - b.x) < 75 && Math.abs(a.y - b.y) < 100) {
    const direction = a.x <= b.x ? 1 : -1;
    const correction = (75 - Math.abs(a.x - b.x)) / 2;
    a.x = Math.min(1140, Math.max(60, a.x - direction * correction));
    b.x = Math.min(1140, Math.max(60, b.x + direction * correction));
  }
  // Resolve both attack intents before damage so same-frame hits can trade.
  const hits = [];
  for (let i = 0; i < 2; i++) {
    const f = match.fighters[i], other = match.fighters[1 - i], attack = f.attack;
    if (!attack) continue;
    const move = MOVES[attack.kind];
    attack.time += dt;
    const active = attack.time >= move.active && attack.time <= move.until;
    if (attack.kind === 'special' && !attack.emitted && attack.time >= move.active) {
      attack.emitted = true;
      if (f.id === 'popeye') {
        f.buff = 6;
        f.hp = Math.min(100, f.hp + 8);
        match.effects.push({ x: f.x, y: FLOOR + f.y - 180, life: .7, max: .7, text: 'SPINACH!', blocked: false });
      } else if (['mickey', 'felix', 'betty'].includes(f.id)) {
        match.projectiles.push({ x: f.x + attack.face * 65, y: f.y - 95, direction: attack.face, owner: i, kind: f.id, life: 2.5 });
      }
    }
    const melee = attack.kind !== 'special' || ['minnie', 'oswald'].includes(f.id);
    if (active && melee && !attack.hit && (other.x - f.x) * attack.face > 0 && Math.abs(other.x - f.x) < f.reach + move.reach && Math.abs(other.y - f.y) < move.height) {
      attack.hit = true;
      hits.push([other, f, move.damage * f.power * (f.buff > 0 ? 1.5 : 1), move.push, attack.face]);
    }
    if (attack.time >= move.duration) { f.attack = null; f.cooldown = .08; }
  }
  for (const args of hits) hit(match, ...args);
  match.projectiles = match.projectiles.filter(p => {
    p.x += p.direction * 460 * dt;
    p.life -= dt;
    const f = match.fighters[p.owner], other = match.fighters[1 - p.owner];
    if (Math.abs(p.x - other.x) < 44 && Math.abs(p.y - (other.y - 95)) < 65) {
      hit(match, other, f, 17 * f.power, 52, p.direction);
      return false;
    }
    return p.life > 0 && p.x > -60 && p.x < 1260;
  });
  if (a.hp <= 0 || b.hp <= 0 || match.time === 0) {
    match.roundWinner = a.hp === b.hp ? null : a.hp > b.hp ? 0 : 1;
    if (match.roundWinner !== null) match.fighters[match.roundWinner].wins++;
    match.phase = 'roundover';
    match.phaseTime = 2.2;
    match.projectiles = [];
    match.events.push({ type: 'ko' });
  }
}
