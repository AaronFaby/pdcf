import { stageFor } from './assets/runtime/stages.mjs';

export const ROSTER = [
  { id: 'mickey', name: 'Mickey Mouse', short: 'Mickey', year: '1928', title: 'The headliner', style: 'ALL-ROUNDER', speed: 278, power: 1, reach: 114, special: 'Steamboat blast', quote: 'A little mouse. A big right hook.' },
  { id: 'minnie', name: 'Minnie Mouse', short: 'Minnie', year: '1928', title: 'The showstopper', style: 'SPEED', speed: 325, power: .86, reach: 105, special: 'Charleston rush', quote: 'Light on her feet. Heavy on the hits.' },
  { id: 'oswald', name: 'Oswald', short: 'Oswald', year: '1927', title: 'The lucky one', style: 'REACH', speed: 288, power: .96, reach: 147, special: 'Lucky uppercut', quote: 'Long ears. Longer winning streak.' },
  { id: 'felix', name: 'Felix the Cat', short: 'Felix', year: '1919', title: 'The wild card', style: 'TRICKSTER', speed: 292, power: .93, reach: 120, special: 'Ink blot', quote: 'Every trick in the inkwell.' },
  { id: 'betty', name: 'Betty Boop', short: 'Betty', year: '1930', title: 'The knockout', style: 'RANGED', speed: 285, power: .95, reach: 110, special: 'Boop blast', quote: 'Her next number is a knockout.' },
  { id: 'popeye', name: 'Popeye', short: 'Popeye', year: '1929', title: 'The heavyweight', style: 'POWER', speed: 244, power: 1.15, reach: 126, special: 'Spinach power', quote: 'Strong to the finish.' }
];

export const WIDTH = 1200;
export const FLOOR = 545;
export const SPECIAL_COST = 35;
export const THROW_HOLD = .18;
export const CPU_DIFFICULTIES = {
  easy: { reaction: .28, variation: .16, attack: .5, guard: .28, evade: .3, special: .35, throw: .4, dash: .4, combo: .25, confirm: .14, punish: .3 },
  normal: { reaction: .15, variation: .1, attack: .8, guard: .65, evade: .65, special: .7, throw: .75, dash: .75, combo: .7, confirm: .065, punish: .7 },
  hard: { reaction: .09, variation: .06, attack: .96, guard: .85, evade: .9, special: .9, throw: 1, dash: 1, combo: .95, confirm: .04, punish: .95 }
};
export const CPU_TACTICS = {
  mickey: { name: 'Balanced headliner', description: 'Mixes mid-range punches, kicks and steam shots; confirms punches into kicks.', range: .85, retreat: .15, kick: .45, projectile: .55, throw: .35, dash: .3, combo: .9 },
  minnie: { name: 'Rushdown dancer', description: 'Closes quickly, pressures with fast punches and chains into kicks or her rushing special.', range: .7, retreat: .05, kick: .25, projectile: 0, throw: .4, dash: .85, combo: 1 },
  oswald: { name: 'Long-range counterpuncher', description: 'Keeps opponents at the end of his reach and punishes missed moves with kicks and uppercuts.', range: .98, retreat: .65, kick: .8, projectile: 0, throw: .2, dash: .15, combo: .65 },
  felix: { name: 'Ink-and-feint trickster', description: 'Alternates ink shots with close attacks, retreats and sudden dashes.', range: .85, retreat: .5, kick: .45, projectile: .8, throw: .55, dash: .65, combo: .8 },
  betty: { name: 'Projectile bandleader', description: 'Uses sound waves and retreats while ink is available; fights with kicks when it runs low.', range: 1, retreat: .85, kick: .85, projectile: 1, throw: .2, dash: .2, combo: .65 },
  popeye: { name: 'Spinach bruiser', description: 'Powers up at a safe distance, then closes for heavy punches and guard-beating throws.', range: .72, retreat: .05, kick: .3, projectile: 0, throw: .95, dash: .55, combo: .75 }
};
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
  if (f.id === 'minnie' && kind === 'punch') return { ...move, duration: .28, active: .07, until: .15, push: 22 };
  if (f.id === 'minnie' && kind === 'kick') return { ...move, duration: .43, active: .14, until: .25, push: 40 };
  if (f.id === 'oswald' && kind === 'punch') return { ...move, duration: .38, active: .12, until: .21 };
  if (f.id === 'oswald' && kind === 'kick') return { ...move, duration: .54, active: .2, until: .3 };
  if (f.id === 'felix' && kind === 'punch') return { ...move, duration: .3, active: .08, until: .17 };
  if (f.id === 'betty' && kind === 'kick') return { ...move, duration: .44, active: .15, until: .27 };
  return move;
}

function fighter(id, index) {
  const spec = ROSTER.find(f => f.id === id);
  if (!spec) throw new Error('Unknown fighter: ' + id);
  return { ...spec, x: index ? 860 : 340, y: 0, vx: 0, vy: 0, face: index ? -1 : 1, hp: 100, meter: 35, wins: 0, attack: null, hurt: 0, reaction: null, thrown: null, land: 0, cooldown: 0, guard: false, buff: 0, walk: 0, buffer: null, dash: 0, dashCooldown: 0, dashFace: 1, combo: 0, comboDamage: 0, comboTime: 0 };
}

export function createMatch(a = 'mickey', b = 'popeye', mode = 'cpu', difficulty = 'normal', stage = 'ink-harbor') {
  const match = { fighters: [fighter(a, 0), fighter(b, 1)], mode, difficulty: Object.hasOwn(CPU_DIFFICULTIES, difficulty) ? difficulty : 'normal', stage: stageFor(stage).id, phase: 'countdown', phaseTime: 2.4, time: 60, round: 1, projectiles: [], effects: [], events: [], winner: null, roundWinner: null, roundEndReason: null, elapsed: 0, hitstop: 0, shake: 0, ai: [{ clock: 0, action: {} }, { clock: 0, action: {} }] };
  if (mode === 'training') {
    match.training = { dummy: 'stand', infiniteHealth: true, infiniteInk: true, lastHit: null, feedback: null, inputs: [], previousInput: {} };
    resetTraining(match);
  }
  return match;
}

export function resetTraining(match) {
  if (!match.training) return;
  const fresh = createMatch(...match.fighters.map(f => f.id), 'local', 'normal', match.stage);
  Object.assign(match, fresh, { mode: 'training', phase: 'fight', training: { ...match.training, lastHit: null, feedback: null, inputs: [], previousInput: {} } });
  match.fighters[0].x = 520; match.fighters[1].x = 620;
  if (match.training.infiniteInk) for (const f of match.fighters) f.meter = 100;
}

export function trainingInput(match, dt, random = Math.random) {
  if (match.training?.dummy === 'guard') return { guard: true };
  if (match.training?.dummy === 'jump') return { jump: true };
  if (match.training?.dummy === 'cpu') return cpuInput(match, dt, random, 1, 'normal');
  return {};
}

export function cpuInput(match, dt, random = Math.random, index = 1, difficulty = match.difficulty) {
  if (match.phase !== 'fight' || match.hitstop > 0) return {};
  const ai = match.ai[index];
  const settings = CPU_DIFFICULTIES[difficulty] || CPU_DIFFICULTIES.normal;
  const self = match.fighters[index], foe = match.fighters[1 - index], tactic = CPU_TACTICS[self.id];
  // Confirming our own punch is quicker than reacting to an opponent's next move.
  if (self.attack?.kind === 'punch' && self.attack.connected) {
    if (ai.confirmed !== self.attack) { ai.confirmed = self.attack; ai.confirmClock = settings.confirm; ai.combo = random() < settings.combo * tactic.combo; }
    ai.confirmClock -= dt;
    if (ai.combo && ai.confirmClock <= 0) {
      ai.combo = false; ai.action = {};
      return { [self.id === 'minnie' && self.meter >= SPECIAL_COST && random() < .35 ? 'special' : 'kick']: true };
    }
  }
  ai.clock -= dt;
  if (self.hurt > 0 && self.reaction === 'block') return ai.action = { guard: true };
  if (ai.clock > 0) return { ...ai.action, punch: false, kick: false, special: false, jump: false, throw: false, dash: false };
  ai.clock = (settings.reaction + random() * settings.variation) * (1 - Math.min(5, match.arcadeStage || 0) * .02);
  const enemy = ai.observed;
  // Only public, delayed state: never read the player's commands or input buffer.
  const incoming = match.projectiles.find(p => p.owner !== index && (self.x - p.x) * p.direction > 0 && Math.abs(p.y - (self.y - 95)) < 70);
  ai.observed = { x: foe.x, y: foe.y, guard: foe.guard, hurt: foe.hurt, cooldown: foe.cooldown, attack: foe.attack && { kind: foe.attack.kind, time: foe.attack.time }, projectile: incoming && { x: incoming.x, y: incoming.y } };
  if (!enemy || self.hp <= 0 || self.thrown || self.hurt > 0) return ai.action = {};
  const distance = Math.abs(enemy.x - self.x);
  const toward = self.x < enemy.x ? 'right' : 'left', away = toward === 'right' ? 'left' : 'right';
  const punchRange = self.reach - 8, kickRange = self.reach + moveFor(self, 'kick').reach - 8;
  const hasInk = self.meter >= SPECIAL_COST;
  const target = self.id === 'betty' && hasInk ? 270 : self.reach * tactic.range;
  const retreat = distance < target - 20 && self.x > 90 && self.x < 1110 && random() < tactic.retreat;
  const action = {};
  if (distance > target + 12) action[toward] = true;
  else if (retreat) action[away] = true;
  const projectile = enemy.projectile && Math.abs(enemy.projectile.x - self.x) < 240;
  const danger = enemy.attack && distance < foe.reach + 60;
  if (self.y === 0 && (projectile || danger)) {
    if (projectile && random() < settings.evade) return ai.action = { jump: true, [toward]: true };
    if (random() < settings.guard) return ai.action = { guard: true };
  }
  const recovering = enemy.cooldown > 0 || (enemy.attack && enemy.attack.time > moveFor(foe, enemy.attack.kind).until);
  if (self.attack || self.cooldown > 0 || Math.abs(enemy.y - self.y) > 95) return ai.action = action;
  if (self.id === 'felix' && retreat && distance < 100 && self.y === 0 && self.dashCooldown <= 0 && random() < settings.dash * .45) return ai.action = { [away]: true, dash: true };
  if (random() < (recovering ? settings.punish : settings.attack)) {
    if (hasInk && self.id === 'popeye' && self.buff <= 0 && distance > 175) action.special = true;
    else if (hasInk && tactic.projectile && distance > 190 && distance < 600 && random() < settings.special * tactic.projectile && !match.projectiles.some(p => p.owner === index)) action.special = true;
    else if (distance < self.reach + moveFor(self, 'throw').reach - 6 && enemy.y === 0 && enemy.hurt <= 0 && (enemy.guard || self.id === 'popeye') && random() < settings.throw * tactic.throw) action.throw = true;
    else if (hasInk && ['minnie', 'oswald'].includes(self.id) && distance < self.reach + moveFor(self, 'special').reach - 12 && (distance > punchRange || (self.id === 'oswald' && enemy.y < -25)) && random() < settings.special) action.special = true;
    else if (distance < kickRange) action[distance < punchRange && random() > tactic.kick ? 'punch' : 'kick'] = true;
  }
  if (!action.special && !action.throw && !action.punch && !action.kick && distance > target + 100 && self.y === 0 && self.dashCooldown <= 0 && random() < settings.dash * tactic.dash) action.dash = true;
  return ai.action = action;
}

function beginAttack(match, f, kind, index) {
  const cancel = f.attack?.connected && f.attack.kind === 'punch' && ['kick', 'special'].includes(kind) && f.attack.time >= moveFor(f, 'punch').active;
  if (f.hp <= 0 || (f.attack && !cancel) || f.hurt > 0 || f.thrown || f.cooldown > 0 || f.guard || f.dash > 0 || (f.y < 0 && ['throw', 'special'].includes(kind))) return false;
  if (kind === 'special') {
    if (f.meter < SPECIAL_COST) return false;
    f.meter -= SPECIAL_COST;
  }
  f.attack = { kind, time: 0, hit: false, connected: false, emitted: false, face: f.face, air: f.y < 0 };
  match.events.push({ type: 'swing', kind, index, character: f.id, cancel: !!cancel });
  if (index === 0 && cancel) trainingFeedback(match, { type: 'cancel', kind });
  return true;
}

function trainingFeedback(match, feedback) {
  if (match.training) match.training.feedback = feedback;
}
function whiff(match, index, kind) { if (index === 0) trainingFeedback(match, { type: 'whiff', kind }); }
function rejection(f, kind) {
  if (f.thrown) return 'thrown';
  if (f.hurt > 0 || f.hp <= 0) return f.reaction === 'block' ? 'block' : 'hurt';
  if (f.guard) return 'guard';
  if (f.dash > 0) return 'dash';
  if (f.y < 0 && ['throw', 'special'].includes(kind)) return 'air';
  if (kind === 'special' && f.meter < SPECIAL_COST) return 'ink';
  return 'recovery';
}

function hit(match, defender, attacker, damage, push, direction, kind = 'punch', attack = null) {
  if (defender.hp <= 0 || defender.thrown) return false;
  if (kind === 'throw' && (defender.y < 0 || defender.hurt > 0)) return false;
  const blocked = kind !== 'throw' && defender.guard && defender.y === 0 && defender.face === -direction;
  const defendingMove = defender.attack && moveFor(defender, defender.attack.kind);
  const released = defender.attack?.kind === 'special' && ['mickey', 'felix', 'betty', 'popeye'].includes(defender.id);
  const recovering = defender.cooldown > 0 || (defendingMove && defender.attack.time > (released ? defendingMove.active : defendingMove.until));
  const impact = blocked || kind === 'throw' ? null : defendingMove && defender.attack.time < defendingMove.active ? 'counter' : recovering ? 'punish' : null;
  const amount = blocked ? damage * .15 : damage;
  const combo = !blocked && defender.hurt > 0 && defender.reaction === 'hurt' && attacker.comboTime > 0;
  defender.hp = Math.max(match.training?.infiniteHealth ? 1 : 0, defender.hp - amount);
  defender.hurt = blocked ? .1 : .25;
  defender.reaction = blocked ? 'block' : 'hurt';
  if (!blocked) { defender.attack = null; defender.dash = 0; }
  if (kind === 'throw') {
    defender.thrown = { by: match.fighters.indexOf(attacker), direction, phase: 'held', time: 0, speed: push * 3 };
    defender.vx = defender.vy = 0; defender.guard = false; defender.buffer = null;
  } else defender.x = Math.min(1140, Math.max(60, defender.x + direction * (blocked ? push * .3 : push)));
  defender.meter = Math.min(100, defender.meter + (blocked ? 5 : 9));
  attacker.meter = Math.min(100, attacker.meter + (blocked ? 3 : 7));
  match.effects.push({ x: defender.x - direction * 25, y: FLOOR + defender.y - 105, life: .28, max: .28, blocked, heavy: kind !== 'throw' && damage >= 14, impact, direction, text: blocked ? 'CLINK!' : kind === 'throw' ? 'GOTCHA!' : impact === 'counter' ? 'COUNTER!' : impact === 'punish' ? 'PUNISH!' : damage >= 14 ? 'POW!' : 'WHAM!' });
  if (attack) attack.outcome = blocked ? 'blocked' : 'hit';
  if (!blocked) {
    attacker.combo = combo ? attacker.combo + 1 : 1;
    attacker.comboDamage = combo ? attacker.comboDamage + amount : amount;
    attacker.comboTime = .8;
    if (attack && attacker.attack === attack) attack.connected = true;
  } else { attacker.combo = 0; attacker.comboDamage = 0; attacker.comboTime = 0; }
  if (match.training) {
    defender.healthRecovery = true;
    match.training.lastHit = { attacker: match.fighters.indexOf(attacker), kind, damage: amount, blocked, impact, hits: attacker.combo, comboDamage: attacker.comboDamage };
    trainingFeedback(match, { type: blocked ? 'block' : 'hit', index: match.fighters.indexOf(attacker), kind, damage: amount, hits: attacker.combo, impact });
  }
  match.hitstop = Math.max(match.hitstop, (blocked ? .025 : kind === 'throw' || damage >= 14 ? .065 : .045) + (impact ? .01 : 0));
  match.shake = blocked ? 2 : damage >= 14 ? 7 : 4;
  match.events.push({ type: blocked ? 'block' : 'hit', heavy: kind !== 'throw' && damage >= 14, index: match.fighters.indexOf(attacker), kind, damage: amount, hits: attacker.combo, impact });
  return true;
}

function advanceThrow(match, f, dt) {
  const thrown = f.thrown, owner = match.fighters[thrown.by];
  thrown.time += dt; f.guard = false; f.buffer = null;
  if (thrown.phase === 'held') {
    if (owner.attack?.kind !== 'throw' || owner.hurt > 0) {
      f.thrown = null; f.y = f.vy = f.vx = 0; f.hurt = .12; return;
    }
    const lift = Math.min(1, thrown.time / THROW_HOLD);
    f.x = Math.min(1140, Math.max(60, owner.x + thrown.direction * (80 - 15 * lift)));
    f.y = -90 * lift;
    if (lift === 1) { thrown.phase = 'air'; thrown.time = 0; f.vy = -430; f.vx = thrown.direction * thrown.speed; }
  } else if (thrown.phase === 'air') {
    f.x = Math.min(1140, Math.max(60, f.x + f.vx * dt));
    f.vy += 1700 * dt; f.y += f.vy * dt;
    if (f.y >= 0) {
      f.y = f.vy = f.vx = 0; thrown.phase = 'down'; thrown.time = 0;
      match.effects.push({ x: f.x, y: FLOOR - 25, life: .32, max: .32, blocked: false, heavy: true, direction: thrown.direction, text: 'SLAM!' });
      match.hitstop = Math.max(match.hitstop, .065); match.shake = 7;
      match.events.push({ type: 'throw', heavy: true, index: thrown.by });
    }
  } else if (thrown.time >= .18) {
    f.thrown = null; f.hurt = 0; f.reaction = null; f.land = .12;
  }
}

function resetRound(match) {
  match.fighters = match.fighters.map((f, i) => ({ ...fighter(f.id, i), wins: f.wins }));
  match.projectiles = [];
  match.effects = [];
  match.hitstop = 0;
  match.shake = 0;
  match.ai = [{ clock: 0, action: {} }, { clock: 0, action: {} }];
  match.phase = 'countdown';
  match.phaseTime = 2.4;
  match.time = 60;
  match.roundEndReason = null;
  match.round++;
}

export function tick(match, inputs, dt) {
  if (!(dt > 0) || !Number.isFinite(dt)) return;
  dt = Math.min(dt, .05);
  match.events = [];
  if (match.phase === 'matchover') return;
  const commands = [inputs[0] || {}, inputs[1] || {}];
  if (match.training) {
    const labels = { left: '←', right: '→', jump: 'Jump', guard: 'Guard', punch: 'Punch', kick: 'Kick', special: 'Special', throw: 'Throw', dash: 'Dash' };
    const pressed = Object.keys(labels).filter(key => commands[0][key] && (!['left', 'right', 'guard'].includes(key) || !match.training.previousInput[key]));
    if (pressed.length) match.training.inputs = [pressed.map(key => labels[key]).join(' + '), ...match.training.inputs].slice(0, 8);
    match.training.previousInput = { ...commands[0] };
    if (match.training.infiniteInk) for (const f of match.fighters) f.meter = 100;
  }
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
      if (match.training) { resetTraining(match); return; }
      const winner = match.fighters.findIndex(f => f.wins >= 2);
      if (winner >= 0) { match.phase = 'matchover'; match.winner = winner; }
      else resetRound(match);
    }
    return;
  }
  if (!match.training) match.time = Math.max(0, match.time - dt);
  for (let i = 0; i < 2; i++) {
    const f = match.fighters[i], other = match.fighters[1 - i], input = commands[i];
    f.face = other.x >= f.x ? 1 : -1;
    f.hurt = Math.max(0, f.hurt - dt);
    f.land = Math.max(0, f.land - dt);
    f.cooldown = Math.max(0, f.cooldown - dt);
    f.buff = Math.max(0, f.buff - dt);
    f.dashCooldown = Math.max(0, f.dashCooldown - dt);
    f.comboTime = Math.max(0, f.comboTime - dt);
    if (f.comboTime === 0) { f.combo = 0; f.comboDamage = 0; }
    if (f.thrown) { advanceThrow(match, f, dt); continue; }
    f.guard = f.hp > 0 && !!input.guard && f.y === 0 && !f.attack && !f.dash && (f.hurt <= 0 || f.reaction === 'block');
    const airVelocity = f.y < 0 ? f.vx : 0;
    f.vx = 0;
    if (f.buffer) {
      if (beginAttack(match, f, f.buffer.kind, i)) f.buffer = null;
      else if ((f.buffer.life -= dt) <= 0) {
        if (i === 0) trainingFeedback(match, { type: 'rejected', kind: f.buffer.kind, reason: rejection(f, f.buffer.kind) });
        f.buffer = null;
      }
    }
    if (f.attack?.air && f.hurt <= 0) f.vx = airVelocity;
    if (f.hp > 0 && f.hurt <= 0 && !f.guard && !f.attack) {
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
  if (!a.thrown && !b.thrown && Math.abs(a.x - b.x) < 75 && Math.abs(a.y - b.y) < 100) {
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
        f.buff = 6; attack.outcome = 'power';
        if (i === 0) trainingFeedback(match, { type: 'power', kind: 'special' });
        f.hp = Math.min(100, f.hp + 8);
        match.effects.push({ x: f.x, y: FLOOR + f.y - 180, life: .7, max: .7, text: 'SPINACH!', blocked: false });
      } else if (['mickey', 'felix', 'betty'].includes(f.id)) {
        match.projectiles.push({ x: f.x + attack.face * 65, y: f.y - 95, direction: attack.face, owner: i, kind: f.id, life: 2.5, attack });
      }
      match.events.push({ type: f.id === 'popeye' ? 'spinach' : 'special', index: i, character: f.id });
    }
    const melee = attack.kind !== 'special' || ['minnie', 'oswald'].includes(f.id);
    if (active && melee && !attack.hit && (other.x - f.x) * attack.face > 0 && Math.abs(other.x - f.x) < f.reach + move.reach && Math.abs(other.y - f.y) < move.height) {
      attack.hit = true;
      hits.push([other, f, move.damage * f.power * (f.buff > 0 ? 1.5 : 1), move.push, attack.face, attack.kind, attack]);
    }
    if (attack.time >= move.duration) {
      if (!attack.outcome && melee) whiff(match, i, attack.kind);
      f.attack = null; f.cooldown = .08;
    }
  }
  for (const args of hits) hit(match, ...args);
  match.projectiles = match.projectiles.filter(p => {
    p.x += p.direction * 460 * dt;
    p.life -= dt;
    const f = match.fighters[p.owner], other = match.fighters[1 - p.owner];
    if (Math.abs(p.x - other.x) < 44 && Math.abs(p.y - (other.y - 95)) < 65) {
      if (!hit(match, other, f, 17 * f.power, 52, p.direction, 'special', p.attack)) whiff(match, p.owner, 'special');
      return false;
    }
    const alive = p.life > 0 && p.x > -60 && p.x < 1260;
    if (!alive) whiff(match, p.owner, 'special');
    return alive;
  });
  if (match.training) {
    if (match.training.infiniteInk) for (const f of match.fighters) f.meter = 100;
    if (match.training.infiniteHealth) for (const [i, f] of match.fighters.entries()) {
      if (f.healthRecovery && !f.thrown && f.hurt === 0 && match.fighters[1 - i].comboTime === 0) { f.hp = 100; f.healthRecovery = false; }
    }
  }
  if ((a.hp <= 0 || b.hp <= 0 || (!match.training && match.time === 0)) && !match.fighters.some(f => f.thrown && f.thrown.phase !== 'down')) {
    match.roundEndReason = a.hp <= 0 || b.hp <= 0 ? 'knockout' : 'timeout';
    match.roundWinner = a.hp === b.hp ? null : a.hp > b.hp ? 0 : 1;
    if (match.roundWinner !== null && !match.training) match.fighters[match.roundWinner].wins++;
    match.phase = 'roundover';
    match.phaseTime = 2.2;
    match.projectiles = [];
    match.events.push({ type: 'ko' });
  }
}
