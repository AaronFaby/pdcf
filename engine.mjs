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
  special: { duration: .65, active: .22, until: .38, damage: 19, reach: 60, height: 100, push: 65 },
  throw: { duration: .6, active: .14, until: .2, damage: 14, reach: -18, height: 40, push: 115 }
};

export function moveFor(f, kind) {
  const move = MOVES[kind];
  if (f.id === 'popeye' && kind === 'punch') return { ...move, duration: .4, active: .14, until: .23, damage: 10, push: 37 };
  if (f.id === 'popeye' && kind === 'kick') return { ...move, duration: .56, active: .21, until: .34, push: 62 };
  return move;
}

function fighter(id, index) {
  const spec = ROSTER.find(f => f.id === id);
  if (!spec) throw new Error('Unknown fighter: ' + id);
  return { ...spec, x: index ? 860 : 340, y: 0, vx: 0, vy: 0, face: index ? -1 : 1, hp: 100, meter: 35, wins: 0, attack: null, hurt: 0, reaction: null, land: 0, cooldown: 0, guard: false, buff: 0, walk: 0, buffer: null, dash: 0, dashCooldown: 0, dashFace: 1, combo: 0, comboTime: 0 };
}

export function createMatch(a = 'mickey', b = 'popeye', mode = 'cpu') {
  return { fighters: [fighter(a, 0), fighter(b, 1)], mode, phase: 'countdown', phaseTime: 2.4, time: 60, round: 1, projectiles: [], effects: [], events: [], winner: null, roundWinner: null, elapsed: 0, hitstop: 0, shake: 0, ai: { clock: 0, action: {} } };
}

export function cpuInput(match, dt, random = Math.random) {
  const ai = match.ai;
  ai.clock -= dt;
  if (ai.clock > 0) return { ...ai.action, punch: false, kick: false, special: false, jump: false, throw: false, dash: false };
  ai.clock = .15 + random() * .17;
  const [enemy, self] = match.fighters;
  const distance = Math.abs(enemy.x - self.x);
  const close = distance < self.reach + 22;
  ai.action = {
    left: self.x > enemy.x && !close,
    right: self.x < enemy.x && !close,
    guard: enemy.attack !== null && distance < enemy.reach + 55 && random() < .64,
    jump: (distance > 220 && random() < .12) || (match.projectiles.some(p => p.owner === 0 && Math.abs(p.x - self.x) < 210) && random() < .65),
    punch: close && random() < .55,
    kick: close && random() < .48,
    special: self.meter >= SPECIAL_COST && distance < 460 && random() < .38,
    throw: distance < 90 && enemy.guard && random() < .55,
    dash: distance > 370 && random() < .2
  };
  return ai.action;
}

function beginAttack(match, f, kind, index) {
  const cancel = f.attack?.connected && f.attack.kind === 'punch' && ['kick', 'special'].includes(kind) && f.attack.time >= moveFor(f, 'punch').active;
  if ((f.attack && !cancel) || f.hurt > 0 || f.cooldown > 0 || f.guard || f.dash > 0 || (f.y < 0 && ['throw', 'special'].includes(kind))) return false;
  if (kind === 'special') {
    if (f.meter < SPECIAL_COST) return false;
    f.meter -= SPECIAL_COST;
  }
  f.attack = { kind, time: 0, hit: false, connected: false, emitted: false, face: f.face, air: f.y < 0 };
  match.events.push({ type: 'swing', kind, index, character: f.id });
  return true;
}

function hit(match, defender, attacker, damage, push, direction, kind = 'punch', attack = null) {
  if (defender.hp <= 0) return;
  if (kind === 'throw' && (defender.y < 0 || defender.hurt > 0)) return;
  const blocked = kind !== 'throw' && defender.guard && defender.y === 0 && defender.face === -direction;
  const amount = blocked ? damage * .15 : damage;
  defender.hp = Math.max(0, defender.hp - amount);
  defender.hurt = blocked ? .1 : .25;
  defender.reaction = blocked ? 'block' : 'hurt';
  if (!blocked) { defender.attack = null; defender.dash = 0; }
  defender.x = Math.min(1140, Math.max(60, defender.x + direction * (blocked ? push * .3 : push)));
  defender.meter = Math.min(100, defender.meter + (blocked ? 5 : 9));
  attacker.meter = Math.min(100, attacker.meter + (blocked ? 3 : 7));
  match.effects.push({ x: defender.x - direction * 25, y: FLOOR + defender.y - 105, life: .28, max: .28, blocked, text: blocked ? 'CLINK!' : damage >= 17 ? 'POW!' : 'WHAM!' });
  if (!blocked) {
    attacker.combo = attacker.comboTime > 0 ? attacker.combo + 1 : 1;
    attacker.comboTime = .8;
    if (attack && attacker.attack === attack) attack.connected = true;
  }
  match.hitstop = Math.max(match.hitstop, blocked ? .025 : kind === 'throw' || damage >= 14 ? .065 : .045);
  match.shake = blocked ? 2 : damage >= 14 ? 7 : 4;
  match.events.push({ type: blocked ? 'block' : kind === 'throw' ? 'throw' : 'hit', heavy: damage >= 14, index: match.fighters.indexOf(attacker) });
}

function resetRound(match) {
  match.fighters = match.fighters.map((f, i) => ({ ...fighter(f.id, i), wins: f.wins }));
  match.projectiles = [];
  match.effects = [];
  match.hitstop = 0;
  match.shake = 0;
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
  const commands = [inputs[0] || {}, inputs[1] || {}];
  if (match.phase === 'fight') {
    for (const [i, f] of match.fighters.entries()) {
      const kind = ['special', 'throw', 'kick', 'punch'].find(action => commands[i][action]);
      if (kind) f.buffer = { kind, life: .13 };
    }
    if (match.hitstop > 0) { match.hitstop = Math.max(0, match.hitstop - dt); return; }
  }
  match.elapsed += dt;
  match.shake = Math.max(0, match.shake - dt * 30);
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
  for (let i = 0; i < 2; i++) {
    const f = match.fighters[i], other = match.fighters[1 - i], input = commands[i];
    f.face = other.x >= f.x ? 1 : -1;
    f.hurt = Math.max(0, f.hurt - dt);
    f.land = Math.max(0, f.land - dt);
    f.cooldown = Math.max(0, f.cooldown - dt);
    f.buff = Math.max(0, f.buff - dt);
    f.dashCooldown = Math.max(0, f.dashCooldown - dt);
    f.comboTime = Math.max(0, f.comboTime - dt);
    if (f.comboTime === 0) f.combo = 0;
    f.guard = !!input.guard && f.y === 0 && !f.attack && !f.dash && (f.hurt <= 0 || f.reaction === 'block');
    const airVelocity = f.y < 0 ? f.vx : 0;
    f.vx = 0;
    if (f.buffer) {
      if (beginAttack(match, f, f.buffer.kind, i)) f.buffer = null;
      else if ((f.buffer.life -= dt) <= 0) f.buffer = null;
    }
    if (f.attack?.air && f.hurt <= 0) f.vx = airVelocity;
    if (f.hurt <= 0 && !f.guard && !f.attack) {
      f.vx = ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * f.speed;
      if (input.dash && f.y === 0 && f.dashCooldown <= 0 && f.dash <= 0) {
        f.dash = .16; f.dashCooldown = .48; f.dashFace = Math.sign(f.vx) || f.face;
        match.events.push({ type: 'dash', index: i });
      }
      if (f.dash > 0) { f.dash = Math.max(0, f.dash - dt); f.vx = f.dashFace * f.speed * 2.3; }
      else if (input.jump && f.y === 0) { f.vy = -665; match.events.push({ type: 'jump', index: i }); }
    }
    f.x = Math.min(1140, Math.max(60, f.x + f.vx * dt));
    f.walk += Math.abs(f.vx) * dt / 45;
    if (f.y < 0 || f.vy < 0) {
      f.vy += 1700 * dt;
      f.y += f.vy * dt;
      if (f.y >= 0) { f.y = 0; f.vy = 0; f.land = .12; match.events.push({ type: 'land', index: i }); }
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
    const move = moveFor(f, attack.kind);
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
      match.events.push({ type: f.id === 'popeye' ? 'spinach' : 'special', index: i, character: f.id });
    }
    const melee = attack.kind !== 'special' || ['minnie', 'oswald'].includes(f.id);
    if (active && melee && !attack.hit && (other.x - f.x) * attack.face > 0 && Math.abs(other.x - f.x) < f.reach + move.reach && Math.abs(other.y - f.y) < move.height) {
      attack.hit = true;
      hits.push([other, f, move.damage * f.power * (f.buff > 0 ? 1.5 : 1), move.push, attack.face, attack.kind, attack]);
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
