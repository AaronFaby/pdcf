import test from 'node:test';
import assert from 'node:assert/strict';
import { ROSTER, createMatch, tick } from '../engine.mjs';
import { controlSettings, rebind } from '../assets/runtime/bindings.mjs';
import { LESSONS, startTutorial, retryLesson, nextLesson, endTutorial, tutorialInput, updateTutorial, lessonView, combatFeedback, combatState } from '../assets/runtime/training.mjs';

const dt = 1 / 120;
function step(m, count = 1, command = {}) {
  for (let i = 0; i < count; i++) { tick(m, [command, tutorialInput(m)], dt); updateTutorial(m, command); if (m.training.tutorial?.ready) break; }
}
function wait(m, predicate, count = 240) { for (let i = 0; i < count && !predicate(); i++) step(m); assert.ok(predicate(), 'expected combat transition'); }
function doLesson(m) {
  switch (LESSONS[m.training.tutorial.index].id) {
    case 'move': step(m, 40, { left: true }); step(m, 40, { right: true }); break;
    case 'jump': step(m, 1, { jump: true }); step(m, 140); break;
    case 'attacks': step(m, 1, { punch: true }); step(m, 90); step(m, 1, { kick: true }); step(m, 90); break;
    case 'guard': step(m, 200, { guard: true }); break;
    case 'throw': step(m, 1, { throw: true }); step(m, 200); break;
    case 'dash': step(m, 1, { right: true, dash: true }); step(m, 45); break;
    case 'special': step(m, 1, { special: true }); step(m, 200); break;
    case 'combo': step(m, 1, { punch: true }); wait(m, () => !!m.fighters[0].attack?.connected); step(m, 1, { kick: true }); step(m, 90); break;
  }
}

test('all six fighters can earn every tutorial objective through real combat and restore free-practice options', () => {
  for (const [index, { id }] of ROSTER.entries()) {
    const dummy = ROSTER[(index + 1) % ROSTER.length].id;
    const m = createMatch(id, dummy, 'training', 'normal', 'moonlight-midway');
    Object.assign(m.training, { dummy: 'cpu', infiniteHealth: false, infiniteInk: false });
    startTutorial(m);
    for (let i = 0; i < LESSONS.length; i++) {
      assert.equal(m.training.tutorial.index, i); assert.equal(nextLesson(m), false);
      doLesson(m); assert.equal(m.training.tutorial.ready, true, `${id}: ${LESSONS[i].id}`);
      if (i === 4) assert.equal(m.fighters[1].thrown.phase, 'down', 'throw must finish landing');
      if (i === 6) assert.ok(m.fighters[0].meter < 35, 'special lesson uses real ink costs');
      assert.equal(nextLesson(m), true);
    }
    assert.equal(m.training.tutorial.finished, true);
    assert.deepEqual(m.training.tutorial.results, Array(8).fill('passed'));
    endTutorial(m);
    assert.equal(m.training.tutorial, undefined); assert.equal(m.training.dummy, 'cpu');
    assert.equal(m.training.infiniteHealth, false); assert.equal(m.training.infiniteInk, false);
    assert.equal(m.stage, 'moonlight-midway'); assert.deepEqual(m.fighters.map(f => f.id), [id, dummy]);
    assert.equal(m.training.feedback, null); assert.ok(m.fighters.every(f => !f.attack && !f.thrown && f.y === 0));
  }
});

test('idle time and wrong inputs do not pass lessons; retry, skip and restart keep honest progress', () => {
  const m = createMatch('mickey', 'popeye', 'training'); startTutorial(m);
  step(m, 600); assert.equal(m.training.tutorial.ready, false);
  const clock=m.training.tutorial.clock;m.hitstop=.05;step(m,1,{left:true});assert.equal(m.training.tutorial.clock,clock);m.hitstop=0;
  step(m, 80, { right: true }); assert.equal(m.training.tutorial.ready, false);
  assert.equal(nextLesson(m), false); retryLesson(m); assert.equal(m.training.tutorial.right, 0);
  nextLesson(m, true); assert.equal(m.training.tutorial.index, 1); assert.equal(m.training.tutorial.results[0], 'skipped');
  step(m, 30, { punch: true }); assert.equal(m.training.tutorial.ready, false);
  retryLesson(m); assert.equal(m.training.feedback, null); assert.equal(m.fighters[0].attack, null);
  for (let i = 1; i < LESSONS.length; i++) nextLesson(m, true);
  assert.match(lessonView(m, controlSettings().players[0]).instruction, /0 of 8 lessons passed; 8 skipped/);
  startTutorial(m); assert.equal(m.training.tutorial.index, 0); endTutorial(m); assert.equal(m.training.dummy, 'stand');
  startTutorial(m); while (m.training.tutorial.index < 5) nextLesson(m, true);
  m.fighters[0].x = 1100; m.fighters[1].x = 1185;
  step(m, 1, { right: true, dash: true }); step(m, 50); step(m, 60, { left: true });
  assert.equal(m.training.tutorial.ready, false, 'walking after an obstructed dash cannot earn dash distance');
});

test('blocking, whiffing and separate hits cannot satisfy hit-confirm combo or special goals', () => {
  const m = createMatch('mickey', 'popeye', 'training'); startTutorial(m);
  while (m.training.tutorial.index < 7) nextLesson(m, true);
  m.fighters[1].x = 1000; step(m, 1, { punch: true }); step(m, 90);
  assert.equal(m.training.tutorial.ready, false);
  m.fighters[1].x = 580; step(m, 1, { punch: true }); step(m, 100);
  m.fighters[1].x = 580; step(m, 1, { kick: true }); step(m, 100);
  assert.equal(m.training.tutorial.ready, false, 'separate hits are not a cancel combo');
  retryLesson(m); step(m, 1, { punch: true }); wait(m, () => !!m.fighters[0].attack?.connected);
  m.fighters[1].x = 1000; step(m, 1, { kick: true }); step(m, 100);
  m.fighters[0].x = 500; m.fighters[1].x = 950;
  step(m, 1, { special: true }); wait(m, () => m.training.lastHit?.kind === 'special');
  m.fighters[0].x = m.fighters[1].x - 80; step(m, 1, { kick: true }); step(m, 40);
  assert.equal(m.training.lastHit.hits, 2, 'projectile plus kick makes a different real combo');
  assert.equal(m.training.tutorial.ready, false, 'an old failed cancel cannot validate a later unrelated combo');
  retryLesson(m); doLesson(m); assert.equal(m.training.tutorial.ready, true);
  startTutorial(m); while (m.training.tutorial.index < 6) nextLesson(m, true);
  step(m, 1, { punch: true }); step(m, 90); assert.equal(m.training.tutorial.ready, false);
});

test('an obstructed directional dash cannot lend its direction or distance to a later neutral dash', () => {
  const m = createMatch('mickey', 'popeye', 'training'); startTutorial(m);
  while (m.training.tutorial.index < 5) nextLesson(m, true);
  step(m, 220, { left: true });
  step(m, 1, { left: true, dash: true }); step(m, 50);
  assert.equal(m.training.tutorial.ready, false);
  step(m, 40, { right: true }); step(m, 1, { dash: true }); step(m, 50);
  assert.equal(m.training.tutorial.ready, false, 'the latest dash has no held direction');
  step(m, 80); step(m, 1, { right: true, dash: true }); step(m, 50);
  assert.equal(m.training.tutorial.ready, true, 'a fresh directional dash still passes');
});

test('lesson and coaching prompts follow remapped keyboard/controller profiles without resetting progress', () => {
  let settings = rebind(controlSettings(), 0, 'keyboard', 'punch', 'KeyQ'); settings = rebind(settings, 0, 'buttons', 'punch', 6);
  const m = createMatch('mickey', 'popeye', 'training'); startTutorial(m); nextLesson(m, true); nextLesson(m, true);
  step(m, 1, { punch: true }); step(m, 70);
  const view = lessonView(m, settings.players[0]);
  assert.match(view.bindings, /Q \(keyboard\) \/ LT \/ L2 \(controller\)/);
  assert.equal(view.goals[0][1], true); assert.equal(view.goals[1][1], false);
  settings = rebind(settings, 0, 'keyboard', 'guard', 'KeyT');
  assert.match(combatFeedback({ type: 'rejected', reason: 'guard' }, settings.players[0]).detail, /Guard: T/);
});

test('hit, guard and whiff feedback reflect resolved attacks, including late projectiles', () => {
  const profile = controlSettings().players[0];
  for (const guarded of [false, true]) {
    const m = createMatch('mickey', 'popeye', 'training');
    tick(m, [{ punch: true }, { guard: guarded }], dt);
    for (let i = 0; i < 80; i++) tick(m, [{}, { guard: guarded }], dt);
    assert.equal(m.training.feedback.type, guarded ? 'block' : 'hit');
    assert.match(combatFeedback(m.training.feedback, profile).title, guarded ? /BLOCKED/ : /HIT/);
  }
  const miss = createMatch('mickey', 'popeye', 'training'); miss.fighters[1].x = 950;
  tick(miss, [{ punch: true }, {}], dt); for (let i = 0; i < 70; i++) tick(miss, [{}, {}], dt);
  assert.equal(miss.training.feedback.type, 'whiff');
  const ranged = createMatch('mickey', 'popeye', 'training'); ranged.fighters[0].x = 100; ranged.fighters[1].x = 1000;
  tick(ranged, [{ special: true }, {}], dt); for (let i = 0; i < 90; i++) tick(ranged, [{}, {}], dt);
  assert.equal(ranged.training.feedback, null, 'do not call a travelling projectile a whiff');
  for (let i = 0; i < 200; i++) tick(ranged, [{}, {}], dt);
  assert.equal(ranged.training.feedback.type, 'hit'); assert.equal(ranged.training.feedback.kind, 'special');
  const avoided = createMatch('mickey', 'popeye', 'training');
  tick(avoided, [{ special: true }, { jump: true }], dt); for (let i = 0; i < 240; i++) tick(avoided, [{}, {}], dt);
  assert.equal(avoided.training.feedback.type, 'whiff');
});

test('rejected inputs explain guard, airborne, ink and recovery instead of claiming a miss', () => {
  for (const reason of ['guard', 'air', 'ink', 'recovery']) {
    const m = createMatch('mickey', 'popeye', 'training'); let command;
    if (reason === 'guard') command = { guard: true, punch: true };
    if (reason === 'air') { tick(m, [{ jump: true }, {}], dt); command = { throw: true }; }
    if (reason === 'ink') { m.training.infiniteInk = false; m.fighters[0].meter = 0; command = { special: true }; }
    if (reason === 'recovery') { m.fighters[1].x = 950; tick(m, [{ punch: true }, {}], dt); command = { kick: true }; }
    tick(m, [command, {}], dt);
    for (let i = 0; i < 18; i++) tick(m, [{ guard: reason === 'guard' }, {}], dt);
    assert.equal(m.training.feedback.type, 'rejected', reason); assert.equal(m.training.feedback.reason, reason);
    assert.match(combatFeedback(m.training.feedback, controlSettings().players[0]).title, /NOT/);
  }
});

test('coach state exposes startup, recovery, stun and knockdown; normal matches have no tutorial state', () => {
  const m = createMatch('mickey', 'popeye', 'training');
  assert.equal(combatState(m.fighters[0]), 'READY'); tick(m, [{ punch: true }, {}], dt);
  assert.match(combatState(m.fighters[0]), /STARTUP/);
  for (let i = 0; i < 40; i++) tick(m, [{}, {}], dt);
  assert.match(combatState(m.fighters[0]), /RECOVERY/);
  assert.match(combatState({ thrown: { phase: 'down' } }), /KNOCKED DOWN/);
  assert.match(combatState({ hurt: .2, reaction: 'block' }), /BLOCK STUN/);
  for (const id of ['mickey', 'popeye']) {
    const special = createMatch(id, 'popeye', 'training'); tick(special, [{ special: true }, {}], dt);
    for (let i = 0; i < 35; i++) tick(special, [{}, {}], dt);
    assert.match(combatState(special.fighters[0]), id === 'popeye' ? /SPINACH RELEASED/ : /PROJECTILE RELEASED/);
  }
  const normal = createMatch(); startTutorial(normal); assert.equal(normal.training, undefined);
});
