import { resetTraining, moveFor, SPECIAL_COST } from '../../engine.mjs';
import { ACTIONS, keyName, buttonName } from './bindings.mjs';

export const LESSONS = [
  { id: 'move', title: 'Find your feet', actions: ['left', 'right'], instruction: 'Move at least a short step in each direction. The dummy will wait.' },
  { id: 'jump', title: 'Take a little leap', actions: ['jump'], instruction: 'Jump, then land back on the stage. Jumping can clear grounded strikes.' },
  { id: 'attacks', title: 'The one-two introduction', actions: ['punch', 'kick'], instruction: 'Land one punch and one kick. Move closer if an attack misses; kicks reach farther.' },
  { id: 'guard', title: 'Keep your guard up', actions: ['guard'], instruction: 'Stay close and hold Guard before the dummy’s punch connects. Guard softens damage; it does not stop throws.' },
  { id: 'throw', title: 'Give ’em a lift', actions: ['left', 'right', 'throw'], instruction: 'The dummy is guarding. Move close, release Guard, and throw them. Finish the toss and landing to pass.' },
  { id: 'dash', title: 'Make a quick entrance', actions: ['left', 'right', 'dash'], instruction: 'Hold a direction and press Dash. Travel a short distance and finish the dash. You can still be hit while dashing.' },
  { id: 'special', title: 'Your signature number', actions: ['special'], instruction: 'Use your signature move. This lesson uses normal ink costs; Retry refills your starting ink.' },
  { id: 'combo', title: 'Put it all together', actions: ['punch', 'kick'], instruction: 'Land a punch, then press Kick as it connects to cancel into a two-hit combo. A missed or blocked punch cannot cancel.' }
];

export function bindingHint(profile, action) {
  const pad = action === 'left' || action === 'right' ? `Stick / D-pad ${action}` : buttonName(profile.buttons[action]);
  return `${ACTIONS[action]}: ${keyName(profile.keyboard[action])} (keyboard) / ${pad} (controller)`;
}
export function startTutorial(match) {
  if (!match.training) return;
  const t = match.training;
  const saved = t.tutorial?.saved || { dummy: t.dummy, infiniteHealth: t.infiniteHealth, infiniteInk: t.infiniteInk };
  t.tutorial = { index: 0, results: Array(LESSONS.length).fill(null), saved, finished: false };
  retryLesson(match);
}
export function retryLesson(match) {
  const t = match.training, g = t?.tutorial;
  if (!g || g.finished) return;
  t.dummy = g.index === 4 ? 'guard' : 'stand'; t.infiniteHealth = true; t.infiniteInk = g.index !== 6;
  resetTraining(match);
  Object.assign(g, { ready: false, flags: {}, left: 0, right: 0, clock: 0, nextAttack: 1, lastTime: 0, x: 500 });
  g.results[g.index] = null;
  match.fighters[0].x = 500; match.fighters[1].x = ['move', 'jump', 'dash'].includes(LESSONS[g.index].id) ? 850 : 580;
  if (LESSONS[g.index].id === 'special' && match.fighters[0].id === 'popeye') match.fighters[0].hp = 92;
}
export function nextLesson(match, skip = false) {
  const g = match.training?.tutorial;
  if (!g || g.finished || (!g.ready && !skip)) return false;
  g.results[g.index] = g.ready ? 'passed' : 'skipped';
  g.index++;
  if (g.index === LESSONS.length) g.finished = true;
  else retryLesson(match);
  return true;
}
export function endTutorial(match) {
  const t = match.training, g = t?.tutorial;
  if (!g) return;
  Object.assign(t, g.saved); delete t.tutorial; resetTraining(match);
}
export function tutorialInput(match) {
  const g = match.training?.tutorial;
  if (!g || g.ready || g.finished) return {};
  if (LESSONS[g.index].id === 'throw') return { guard: true };
  const dummy = match.fighters[1];
  if (LESSONS[g.index].id === 'guard' && g.clock >= g.nextAttack && !dummy.attack && dummy.hurt <= 0 && dummy.cooldown <= 0) {
    g.nextAttack = g.clock + 1.25;
    return { punch: true };
  }
  return {};
}
function goals(g) {
  switch (LESSONS[g.index].id) {
    case 'move': return [['Move left', g.left >= 60], ['Move right', g.right >= 60]];
    case 'jump': return [['Jump and land', !!g.flags.landed]];
    case 'attacks': return [['Land a punch', !!g.flags.punch], ['Land a kick', !!g.flags.kick]];
    case 'guard': return [['Block the dummy’s punch', !!g.flags.block]];
    case 'throw': return [['Grab the guarding dummy', !!g.flags.grab], ['Finish the toss', !!g.flags.slam]];
    case 'dash': return [['Dash with a direction held', !!g.flags.dash], ['Finish the dash', !!g.flags.dashFinished]];
    case 'special': return [['Use Spinach Power or land a special', !!g.flags.special]];
    case 'combo': return [['Confirm a punch', !!g.flags.punch], ['Cancel into a connected kick', !!g.flags.combo]];
  }
}
export function updateTutorial(match, input) {
  const g = match.training?.tutorial;
  if (!g || g.ready || g.finished) return false;
  const f = match.fighters[0], delta = match.elapsed - g.lastTime, dx = f.x - g.x;
  g.lastTime = match.elapsed; g.x = f.x; g.clock += Math.max(0, delta);
  if (delta <= 0) return false;
  if (input.left && dx < 0) g.left -= dx;
  if (input.right && dx > 0) g.right += dx;
  for (const event of match.events) {
    if (event.index === 0) {
      if (event.type === 'jump') g.flags.jumped = true;
      if (event.type === 'land' && g.flags.jumped) g.flags.landed = true;
      if (event.type === 'dash' && (input.left || input.right)) { g.flags.dash = true; g.flags.dashX = f.x; }
      if (event.type === 'spinach') g.flags.special = true;
      if (event.type === 'throw' && g.flags.grab) g.flags.slam = true;
      if (event.type === 'swing') g.flags.cancel = event.kind === 'kick' && event.cancel && !!g.flags.punch;
      if (event.type === 'hit') {
        if (event.kind === 'punch') g.flags.punch = true;
        if (event.kind === 'kick') { g.flags.kick = true; if (event.hits >= 2 && g.flags.cancel) g.flags.combo = true; }
        if (event.kind === 'throw') g.flags.grab = true;
        if (event.kind === 'special') g.flags.special = true;
      }
    } else if (event.type === 'block') g.flags.block = true;
  }
  if (g.flags.dash && f.dash > 0 && Math.abs(f.x - g.flags.dashX) >= 50) g.flags.dashDistance = true;
  if (g.flags.dashDistance && f.dash <= 0) g.flags.dashFinished = true;
  g.ready = goals(g).every(([, done]) => done);
  return g.ready;
}
export function lessonView(match, profile) {
  const g = match.training?.tutorial;
  if (!g) return null;
  const passed = g.results.filter(result => result === 'passed').length;
  if (g.finished) return { title: 'Rehearsal complete!', instruction: `${passed} of ${LESSONS.length} lessons passed; ${LESSONS.length - passed} skipped. Return to free practice or restart the course.`, bindings: '', goals: [], progress: 'COURSE COMPLETE', status: 'Your guided rehearsal is finished.' };
  const lesson = LESSONS[g.index];
  let instruction = lesson.instruction;
  if (lesson.id === 'special') instruction += match.fighters[0].id === 'popeye' ? ' Spinach restores health and boosts melee damage for six seconds.' : ' Land your signature strike; projectile travel time depends on distance.';
  const checks = goals(g);
  if (lesson.id === 'special') checks[0][0] = match.fighters[0].id === 'popeye' ? 'Use Spinach Power' : 'Land your special';
  return { ...lesson, instruction, bindings: lesson.actions.map(action => bindingHint(profile, action)).join(' · '), goals: checks, progress: `LESSON ${g.index + 1} / ${LESSONS.length}`, status: g.ready ? 'Lesson passed! Continue, or retry for more practice.' : 'Complete the checklist. Pause → Practice options offers Retry, Skip and Free practice.' };
}

export function combatFeedback(feedback, profile) {
  if (!feedback) return { title: 'Your next move', detail: 'Watch hits, blocks and misses here. The status line shows when you can act.' };
  const { type, kind, index, damage, hits, reason } = feedback;
  if (type === 'whiff') return { title: 'WHIFF — no contact', detail: kind === 'throw' ? 'Move closer. Throws need a grounded opponent who is not stunned or already being thrown.' : 'Check distance and timing. Missed attacks cannot hit-confirm into a combo; watch the status line for recovery.' };
  if (type === 'power') return { title: 'SPINACH POWER', detail: 'Restores up to 8 health and boosts melee damage by 50% for six seconds. Spinach does not hit the dummy.' };
  if (type === 'cancel') return { title: 'COMBO CANCEL', detail: `Your connected punch cancelled into ${kind}. It still needs to reach the opponent.` };
  if (type === 'rejected') {
    const notes = {
      thrown: 'You cannot act during a grab, toss or knockdown. Wait until you recover.',
      block: 'You are in block stun. Keep guarding, then wait for the strike to finish before attacking.',
      hurt: 'You are in hit stun. Wait for recovery before trying another action.',
      guard: `Release Guard before attacking. ${bindingHint(profile, 'guard')}.`,
      dash: 'Finish the dash before attacking. Dashing does not make you invincible.',
      air: 'Throws and specials start on the ground. Land first; punch and kick work in the air.',
      ink: `A special costs ${SPECIAL_COST} ink. Build ink with hits and blocks, or retry the lesson.`,
      recovery: 'The previous move is still recovering. A connected punch can cancel into Kick or Special; missed and blocked punches cannot.'
    };
    return { title: reason === 'ink' ? 'NOT ENOUGH INK' : 'ACTION NOT READY', detail: notes[reason] };
  }
  if (type === 'block') return index === 0 ? { title: 'BLOCKED — the dummy guarded', detail: `Chip damage: ${Number(damage.toFixed(1))}. Try ${bindingHint(profile, 'throw')} at close range to beat ground guard.` } : { title: 'GUARD HELD', detail: `You took ${Number(damage.toFixed(1))} chip damage. Guard reduced the strike’s damage by 85%.` };
  if (index === 1 && kind === 'throw') return { title: 'GRABBED BY THE DUMMY', detail: 'Throws beat Guard. Jump or step out of range before the grab connects.' };
  if (index === 1) return { title: 'HIT BY THE DUMMY', detail: `Guard before the strike connects. ${bindingHint(profile, 'guard')}.` };
  return { title: hits >= 2 ? `${hits}-HIT COMBO` : `HIT — ${kind.toUpperCase()}`, detail: `${Number(damage.toFixed(1))} damage.${kind === 'throw' ? ' Grab connected; the toss adds no extra damage.' : kind === 'punch' ? ' Press Kick or Special as the punch connects to cancel into a combo.' : ' Connected. Wait for recovery before the next move.'}` };
}
export function combatState(f) {
  if (f.thrown) return { held: 'GRABBED — wait for release', air: 'THROWN — wait for landing', down: 'KNOCKED DOWN — recovering' }[f.thrown.phase];
  if (f.hurt > 0) return `${f.reaction === 'block' ? 'BLOCK STUN' : 'HIT STUN'} · ${Math.ceil(f.hurt * 60)}f to recover`;
  if (f.attack) {
    const move = moveFor(f, f.attack.kind), time = f.attack.time;
    if (f.attack.kind === 'special' && ['mickey', 'felix', 'betty', 'popeye'].includes(f.id) && time >= move.active) return `${f.id === 'popeye' ? 'SPINACH' : 'PROJECTILE'} RELEASED · RECOVERY · ${Math.ceil((move.duration - time + .08) * 60)}f to ready`;
    return `${f.attack.kind.toUpperCase()} · ${time < move.active ? `STARTUP · ${Math.ceil((move.active - time) * 60)}f to active` : time <= move.until ? 'ACTIVE' : `RECOVERY · ${Math.ceil((move.duration - time + .08) * 60)}f to ready`}`;
  }
  if (f.cooldown > 0) return `RECOVERY · ${Math.ceil(f.cooldown * 60)}f to ready`;
  if (f.dash > 0) return 'DASHING — vulnerable to attacks';
  if (f.guard) return 'GUARDING — throws can beat this';
  return f.y < 0 ? 'AIRBORNE — punch and kick available' : 'READY';
}
