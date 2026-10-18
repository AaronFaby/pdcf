import { ROSTER, createMatch, tick, cpuInput, trainingInput, resetTraining, moveFor, SPECIAL_COST } from './engine.mjs';
import { drawFighter, drawScene } from './art.mjs';
import { loadCel } from './cels.mjs';
import { loadImage } from './assets/runtime/loading.mjs';
import { ACTIONS, keyName, buttonName } from './assets/runtime/bindings.mjs';
import { ControlPanel } from './assets/runtime/control-panel.mjs';
import { startTutorial, retryLesson, nextLesson, endTutorial, tutorialInput, updateTutorial, lessonView, combatFeedback, combatState } from './assets/runtime/training.mjs';
import { fighterMoves } from './assets/runtime/move-list.mjs';
import { Controllers } from './assets/runtime/controllers.mjs';
import { GameAudio } from './assets/runtime/audio.mjs';
import { ARCADE_KEY, ENDINGS, createArcade, arcadeMatch, finishArcade, restoreArcade } from './assets/runtime/arcade.mjs';
import { STAGES, stageFor, arcadeVenue } from './assets/runtime/stages.mjs';
import { VISUALS_KEY, MOTION_MODES, visualSettings, visualEffects } from './assets/runtime/visuals.mjs';

const $ = id => document.getElementById(id);
const selection = ['mickey', 'popeye'];
let slot = 0, mode = 'cpu', match = null, paused = false, accumulator = 0, lastTime = 0;
let difficulty = 'normal', arcade = null;
let selectedStage = 'ink-harbor';
try { arcade = restoreArcade(JSON.parse(localStorage.getItem(ARCADE_KEY))); } catch { /* A new run works without browser storage. */ }
let preview = createMatch(...selection);
const controllers = new Controllers(), audio = new GameAudio();
let celsReady = false, assetsLoading = false;
const loadedAssets = new Set(), failedAssets = new Map();
const arena = $('arena'), arenaContext = arena.getContext('2d');
const showcaseContext = $('showcase').getContext('2d');
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
let visuals = visualSettings(), visualsStored = true;
try { visuals = visualSettings(JSON.parse(localStorage.getItem(VISUALS_KEY))); } catch { visualsStored = false; }
let effects = visualEffects(visuals, motionQuery.matches);
const backgrounds = new Map();
const held = new Set(), edges = new Set(), touches = new Map(), touchEdges = new Set();
const controls = new ControlPanel(controllers, () => { clearInput(); refreshControlHints(); if ($('moves-dialog').open) renderMoves(); if (match?.training) updatePractice(); });
let moveFighter = 'mickey', movePlayer = 0;
const portraits = [];

function updateVisuals() {
  effects = visualEffects(visuals, motionQuery.matches);
  document.documentElement.dataset.motion = effects.reducedMotion ? 'reduced' : 'full';
  document.documentElement.dataset.film = effects.film ? 'on' : 'off';
  $('visual-motion').textContent = `MOTION: ${{ system: 'FOLLOW SYSTEM', reduced: 'REDUCED', full: 'FULL' }[visuals.motion]}`;
  for (const name of ['shake', 'film', 'backgrounds']) {
    const button = $('visual-' + name);
    button.textContent = `${{ shake: 'SCREEN SHAKE', film: 'FILM EFFECTS', backgrounds: 'MOVING SCENERY' }[name]}: ${effects[name] ? 'ON' : 'OFF'}`;
    button.setAttribute('aria-pressed', String(effects[name])); button.disabled = effects.reducedMotion;
  }
  $('visual-summary').textContent = effects.reducedMotion ? 'Reduced motion: still scenery and idle poses, no shake or film effects. Attacks keep their animation cues.' : 'Full motion. Adjust decorative effects below; fighting speed and attack cues stay the same.';
  $('visual-storage').textContent = visualsStored ? 'Visual preferences are saved on this browser.' : 'Visual preferences apply now, but could not be saved on this browser.';
  portraitFrame = -1;
  if (match && paused) drawScene(arenaContext, match, backgrounds.get(match.stage), match.elapsed, effects);
}
for (const name of ['motion', 'shake', 'film', 'backgrounds']) $('visual-' + name).addEventListener('click', () => {
  visuals[name] = name === 'motion' ? MOTION_MODES[(MOTION_MODES.indexOf(visuals.motion) + 1) % MOTION_MODES.length] : !visuals[name];
  try { localStorage.setItem(VISUALS_KEY, JSON.stringify(visuals)); visualsStored = true; } catch { visualsStored = false; }
  clearInput(); updateVisuals();
});
motionQuery.addEventListener('change', updateVisuals);

let fullscreen = !!document.fullscreenElement;
let fullscreenBusy = false;
const fullscreenButton = $('fullscreen-button');
const fullscreenSupported = !!(document.fullscreenEnabled && document.documentElement.requestFullscreen && document.exitFullscreen);
function fullscreenUI() {
  fullscreenButton.disabled = !fullscreenSupported || fullscreenBusy;
  fullscreenButton.textContent = !fullscreenSupported ? 'FULLSCREEN UNAVAILABLE' : document.fullscreenElement ? 'EXIT FULLSCREEN' : 'ENTER FULLSCREEN';
  fullscreenButton.setAttribute('aria-pressed', String(!!document.fullscreenElement));
}
fullscreenButton.addEventListener('click', async () => {
  clearInput(); fullscreenBusy = true; fullscreenUI();
  const entering = !document.fullscreenElement;
  try {
    if (entering) await document.documentElement.requestFullscreen(); else await document.exitFullscreen();
    if (!!document.fullscreenElement !== entering) throw Error('Fullscreen state did not change');
    $('fullscreen-status').textContent = 'Use this button or your browser’s Escape key to leave fullscreen. Leaving a fight pauses it.';
  } catch { $('fullscreen-status').textContent = 'Fullscreen could not start. Click the button or press Enter on it to try again; windowed play is still available.'; }
  fullscreenBusy = false; fullscreenUI();
  if ($('settings-dialog').open) fullscreenButton.focus({ preventScroll: true });
});
document.addEventListener('fullscreenchange', () => {
  const leaving = fullscreen && !document.fullscreenElement;
  fullscreen = !!document.fullscreenElement; clearInput(); fullscreenUI();
  if (fullscreen) {
    // WebKit can put fullscreen above existing dialogs; restore parents before Options.
    const dialogs = [...document.querySelectorAll('dialog[open]:not(#settings-dialog)')];
    if ($('settings-dialog').open) dialogs.push($('settings-dialog'));
    for (const dialog of dialogs) {
      const top = dialog.scrollTop; dialog.close(); dialog.showModal(); dialog.scrollTop = top;
    }
  }
  if (leaving && match) pause('Fullscreen ended. Release held inputs, then resume when you’re ready.');
  const dialog = document.activeElement?.closest('dialog[open]');
  if (dialog?.id === 'settings-dialog') fullscreenButton.focus({ preventScroll: true });
  if (!dialog && match && !paused) arena.focus({ preventScroll: true });
});
fullscreenUI();
if (!fullscreenSupported) $('fullscreen-status').textContent = 'This browser or embedded view does not offer fullscreen. Windowed play remains available.';

function assetStatus() {
  const total = ROSTER.length + STAGES.length;
  celsReady = ROSTER.every(f => loadedAssets.has(f.id));
  for (const id of ['start-button', 'featured-button', 'arcade-resume']) $(id).disabled = assetsLoading || !celsReady;
  $('asset-progress').max = total; $('asset-progress').value = loadedAssets.size;
  $('asset-progress').hidden = !assetsLoading;
  $('retry-art').hidden = !failedAssets.size; $('retry-art').disabled = assetsLoading;
  $('art-status').textContent = assetsLoading ? `Loading artwork: ${loadedAssets.size} / ${total} ready…` : failedAssets.size ? `${loadedAssets.size} / ${total} ready. Could not load: ${[...failedAssets.values()].join(', ')}. ${celsReady ? 'You can play with drawn stage scenery, or retry.' : 'Retry missing artwork to play.'}` : 'Animation and stage artwork ready.';
  const missingStage = match && failedAssets.has(match.stage);
  $('arena-art-notice').hidden = !missingStage;
  $('arena-art-retry').disabled = assetsLoading;
}
async function loadArtwork() {
  if (assetsLoading) return;
  assetsLoading = true; assetStatus();
  const tasks = [...ROSTER.map(f => ({ id: f.id, label: `${f.short} animation`, load: () => loadCel(f.id) })), ...STAGES.map(stage => ({ id: stage.id, label: `${stage.name} painting`, load: async () => {
    const image = await loadImage(stage.image); image.alt = ''; image.width = 160; image.height = 90;
    document.querySelector(`[data-stage="${stage.id}"] img`).replaceWith(image);
    backgrounds.set(stage.id, image);
  } }))];
  await Promise.allSettled(tasks.map(async task => {
    if (loadedAssets.has(task.id)) return;
    try { await task.load(); loadedAssets.add(task.id); failedAssets.delete(task.id); }
    catch { failedAssets.set(task.id, task.label); }
    assetStatus();
  }));
  assetsLoading = false; if (!match) clearInput(); assetStatus();
}
$('retry-art').addEventListener('click', loadArtwork);
$('arena-art-retry').addEventListener('click', loadArtwork);

function clearInput() {
  held.clear(); edges.clear(); touches.clear(); touchEdges.clear(); controllers.clear(); accumulator = 0;
  for (const fighter of match?.fighters || []) fighter.buffer = null;
}
function input(index) {
  const result = controllers.consume(index);
  for (const [action, key] of Object.entries(controls.settings.players[index].keyboard)) {
    if (action === 'reset') continue;
    const continuous = ['left', 'right', 'guard'].includes(action);
    result[action] = !!result[action] || (continuous ? held : edges).has(key) || (index === 0 && (continuous ? [...touches.values()].includes(action) : touchEdges.has(action)));
  }
  return result;
}

function soundUI() {
  const on = audio.settings.enabled;
  $('sound-button').setAttribute('aria-pressed', String(on));
  $('sound-button').setAttribute('aria-label', `Turn sound ${on ? 'off' : 'on'}`);
  $('sound-button').title = `Turn sound ${on ? 'off' : 'on'}`;
  $('sound-button').querySelector('.sound-state').textContent = on ? 'ON' : 'OFF';
  $('music-volume').value = Math.round(audio.settings.music * 100);
  $('effects-volume').value = Math.round(audio.settings.effects * 100);
  $('music-value').textContent = `${$('music-volume').value}%`;
  $('effects-value').textContent = `${$('effects-volume').value}%`;
}
function audioStatus() {
  $('audio-unlock').hidden = !audio.settings.enabled || (!audio.context && !audio.error) || (audio.context?.state === 'running' && !audio.error);
  $('audio-status').textContent = audio.error ? 'Sound could not start. Check your audio output and connection, then press Enable audio to try again.' : audio.context?.state === 'running' ? `${stageFor(audio.track).music} · Original 32-bar arrangement` : 'Press Enable audio to let the band play.';
}
function unlockAudio() {
  const pending = audio.unlock(); audioStatus(); pending.then(audioStatus);
}
function presentStage(id) {
  const stage = stageFor(id);
  $('preview-stage').textContent = `${String(STAGES.indexOf(stage) + 1).padStart(2, '0')} / ${stage.name.toUpperCase()}`;
  $('arena-stage').textContent = stage.name.toUpperCase();
  $('arena-tagline').textContent = stage.tagline;
  $('showcase').setAttribute('aria-label', `An animated preview of the selected fighters at ${stage.name}`);
  refreshControlHints();
  assetStatus();
  audio.setStage(stage.id).then(audioStatus);
}
$('sound-button').addEventListener('click', () => {
  audio.configure({ enabled: !audio.settings.enabled }); soundUI(); unlockAudio();
});
for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, () => {
  if (!audio.context || audio.context.state !== 'running' || audio.error) unlockAudio();
}, { capture: true });
for (const name of ['music', 'effects']) $(name + '-volume').addEventListener('input', event => {
  audio.configure({ [name]: Number(event.target.value) / 100 }); soundUI();
  if (name === 'effects') audio.play({ type: 'select' });
});
$('enable-audio').addEventListener('click', () => { audio.configure({ enabled: true }); soundUI(); unlockAudio(); });
$('audio-unlock').addEventListener('click', unlockAudio);

function buildRoster() {
  for (const f of ROSTER) {
    const button = document.createElement('button');
    button.className = 'fighter-card'; button.dataset.fighter = f.id;
    button.innerHTML = `<div class="portrait-wrap"><span class="card-year">${f.year}</span><span class="card-selection"></span><canvas width="320" height="300" aria-hidden="true"></canvas></div><div class="card-caption"><strong>${f.name.toUpperCase()}</strong><small>${f.style}</small></div>`;
    button.addEventListener('click', () => { selection[slot] = f.id; updateSelection(); audio.play({ type: 'select' }); });
    $('roster').append(button);
    portraits.push({ context: button.querySelector('canvas').getContext('2d'), fighter: f });
  }
}
function updateSelection() {
  preview = createMatch(...selection, 'cpu', 'normal', mode === 'arcade' ? 'ink-harbor' : selectedStage);
  preview.fighters[0].x = 365; preview.fighters[1].x = 835;
  const current = ROSTER.find(f => f.id === selection[slot]);
  $('detail-title').textContent = current.title.toUpperCase();
  $('detail-quote').textContent = current.quote;
  $('detail-special').textContent = current.special;
  $('preview-name-one').textContent = ROSTER.find(f => f.id === selection[0]).name.toUpperCase();
  $('preview-name-two').textContent = mode === 'arcade' ? 'SIX-BOUT LADDER' : ROSTER.find(f => f.id === selection[1]).name.toUpperCase();
  $('opponent-label').textContent = mode === 'training' ? 'PRACTICE DUMMY' : mode === 'cpu' ? 'CPU OPPONENT' : 'PLAYER TWO';
  document.querySelector('[data-slot="1"]').hidden = mode === 'arcade';
  $('difficulty-picker').hidden = !['cpu', 'arcade'].includes(mode);
  $('arcade-description').hidden = mode !== 'arcade';
  $('stage-description').hidden = mode === 'arcade';
  $('stage-title').textContent = mode === 'arcade' ? 'ARCADE TOUR' : 'SET THE SCENE';
  for (const button of document.querySelectorAll('[data-stage]')) {
    button.disabled = mode === 'arcade';
    button.setAttribute('aria-pressed', String(button.dataset.stage === preview.stage));
  }
  $('stage-description').textContent = stageFor(preview.stage).description + ` Music: ${stageFor(preview.stage).music}.`;
  presentStage(preview.stage);
  $('start-button').textContent = mode === 'arcade' ? 'NEW ARCADE RUN →' : 'LET’S MAKE A SCENE →';
  for (const button of document.querySelectorAll('[data-difficulty]')) button.setAttribute('aria-pressed', String(button.dataset.difficulty === difficulty));
  updateResume();
  for (const button of document.querySelectorAll('.fighter-card')) {
    const id = button.dataset.fighter, chosen = selection[0] === id, opponent = mode !== 'arcade' && selection[1] === id;
    button.classList.toggle('selected', chosen); button.classList.toggle('opponent-selected', opponent);
    button.setAttribute('aria-pressed', String(selection[slot] === id));
    button.setAttribute('aria-label', `${ROSTER.find(f => f.id === id).name}, ${ROSTER.find(f => f.id === id).style.toLowerCase()}${chosen ? ', player one' : ''}${opponent ? ', opponent' : ''}. Select for ${slot ? 'opponent' : 'player one'}.`);
    button.querySelector('.card-selection').innerHTML = `${chosen ? '<span class="badge">P1</span>' : ''}${opponent ? `<span class="badge opponent">${mode === 'training' ? 'DUMMY' : mode === 'cpu' ? 'CPU' : 'P2'}</span>` : ''}`;
  }
  for (const button of document.querySelectorAll('.slot')) {
    const active = Number(button.dataset.slot) === slot;
    button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
  }
  for (const button of document.querySelectorAll('.mode')) {
    const active = button.dataset.mode === mode;
    button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
  }
}
document.querySelectorAll('.slot').forEach(button => button.addEventListener('click', () => { slot = Number(button.dataset.slot); updateSelection(); }));
document.querySelectorAll('.mode').forEach(button => button.addEventListener('click', () => { mode = button.dataset.mode; if (mode === 'arcade') slot = 0; updateSelection(); }));
document.querySelectorAll('[data-difficulty]').forEach(button => button.addEventListener('click', () => { difficulty = button.dataset.difficulty; updateSelection(); }));
for (const stage of STAGES) {
  const button = document.createElement('button'); button.className = 'stage-card'; button.dataset.stage = stage.id;
  button.setAttribute('aria-label', `${stage.name}. ${stage.description}`); button.setAttribute('aria-pressed', String(stage.id === selectedStage));
  const image = document.createElement('img'); image.alt = ''; image.width = 160; image.height = 90;
  const name = document.createElement('span'); name.textContent = stage.name;
  button.append(image, name); button.addEventListener('click', () => { selectedStage = stage.id; updateSelection(); audio.play({ type: 'select' }); });
  $('stage-choices').append(button);
}

function updateResume() {
  $('arcade-resume').hidden = !arcade;
  if (arcade) $('arcade-resume').textContent = `${arcade.status === 'complete' ? 'VIEW ENDING' : 'RESUME ARCADE'} · ${ROSTER.find(f => f.id === arcade.fighter).short.toUpperCase()} · ${arcade.difficulty.toUpperCase()}${arcade.status === 'complete' ? '' : ` · BOUT ${arcade.index + 1}/6`} →`;
}
function saveArcade() {
  try {
    localStorage.setItem(ARCADE_KEY, JSON.stringify(arcade));
    $('arcade-save-status').textContent = arcade.status === 'complete' ? 'Your ending is saved. View it again from the casting screen.' : 'Checkpoint saved in this browser. Resume from casting; an interrupted bout restarts from its first round.';
  } catch { $('arcade-save-status').textContent = 'Progress is available while this page stays open. Browser storage is unavailable.'; }
  updateResume();
}
function showArcade() {
  match = null; paused = false; clearInput();
  for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
  $('selection').hidden = $('game').hidden = true; $('arcade').hidden = false;
  const complete = arcade.status === 'complete', lost = arcade.status === 'lost';
  const player = ROSTER.find(f => f.id === arcade.fighter), opponent = ROSTER.find(f => f.id === arcade.ladder[Math.min(5, arcade.index)]);
  $('arcade-kicker').textContent = complete ? 'THAT’S ALL, CHAMPION.' : lost ? 'THE SHOW ISN’T OVER.' : 'SIX REELS. ONE STAR.';
  $('arcade-title').textContent = complete ? `${player.short} takes the spotlight.` : lost ? 'One more take?' : 'Your name on the marquee.';
  $('arcade-summary').textContent = `${player.name} · ${arcade.difficulty.toUpperCase()} · ${arcade.index}/6 bouts cleared · ${arcade.losses} ${arcade.losses === 1 ? 'loss' : 'losses'}`;
  $('arcade-ladder').replaceChildren(...arcade.ladder.map((id, i) => {
    const li = document.createElement('li'), number = document.createElement('span'), name = document.createElement('strong'), state = document.createElement('small');
    number.textContent = String(i + 1).padStart(2, '0'); name.textContent = ROSTER.find(f => f.id === id).name;
    state.textContent = i < arcade.index ? 'CLEARED ✓' : i === 5 ? 'MIRROR FINALE' : i === arcade.index ? 'UP NEXT' : 'CHALLENGER';
    li.classList.toggle('cleared', i < arcade.index);
    if (i === arcade.index) li.setAttribute('aria-current', 'step');
    const venue = document.createElement('small'); venue.className = 'ladder-venue'; venue.textContent = arcadeVenue(i).name;
    li.append(number, name, state, venue); return li;
  }));
  $('arcade-bout-label').textContent = complete ? 'A PUBLIC DOMAIN CARTOON FIGHTERS ORIGINAL' : `BOUT ${arcade.index + 1} / 6 · ${arcadeVenue(arcade.index).name.toUpperCase()} · BEST OF THREE${arcade.index === 5 ? ' · MIRROR FINALE' : ''}`;
  $('arcade-bout-title').textContent = complete ? ENDINGS[player.id].title : `${player.short} vs. ${opponent.short}`;
  $('arcade-bout-copy').hidden = complete;
  $('arcade-bout-copy').textContent = lost ? 'The ladder is still yours to climb. Continue with a fresh match against the same challenger. Your cleared bouts stay cleared.' : arcade.index === 5 ? 'One last rival knows every trick you do. Beat your own reflection to claim the harbor crown.' : `${opponent.quote} Win two rounds to move up the bill. Every new bout begins with full health and fresh ink.`;
  $('arcade-ending').hidden = !complete;
  $('ending-story').replaceChildren(...ENDINGS[player.id].story.map(text => { const p = document.createElement('p'); p.textContent = text; return p; }));
  $('ending-closing').textContent = ENDINGS[player.id].closing;
  $('arcade-play').textContent = complete ? 'PLAY AGAIN →' : lost ? 'CONTINUE →' : arcade.index ? 'NEXT BOUT →' : 'FIRST BELL →';
  saveArcade(); audio.setScene('menu'); presentStage(arcadeVenue(complete ? 5 : arcade.index).id); $('arcade-play').focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' });
}
function playArcade() {
  if (arcade.status === 'complete') { arcade = createArcade(arcade.fighter, arcade.difficulty); showArcade(); return; }
  const bout = arcadeMatch(arcade);
  if (bout) { saveArcade(); startMatch(bout); }
}
function startSelected() {
  if (!celsReady || assetsLoading) return;
  if (mode === 'arcade') { arcade = createArcade(selection[0], difficulty); showArcade(); }
  else startMatch();
}
$('arcade-play').addEventListener('click', playArcade);
$('arcade-exit').addEventListener('click', returnToSelection);
$('arcade-resume').addEventListener('click', () => {
  if (!celsReady || !arcade) return;
  mode = 'arcade'; slot = 0; selection[0] = arcade.fighter; difficulty = arcade.difficulty; updateSelection(); showArcade();
});

function updateHUD() {
  match.fighters.forEach((f, i) => {
    const side = i ? 'two' : 'one';
    $(`health-${side}`).firstElementChild.style.width = f.hp + '%';
    $(`health-${side}`).setAttribute('aria-valuenow', String(Math.round(f.hp)));
    $(`hp-${side}`).textContent = Math.round(f.hp);
    $(`meter-${side}`).firstElementChild.style.width = f.meter + '%';
    $(`meter-${side}`).setAttribute('aria-valuenow', String(Math.round(f.meter)));
    $(`meter-${side}`).nextElementSibling.textContent = `INK ${Math.round(f.meter)}`;
    $(`meter-${side}`).classList.toggle('ready', f.meter >= SPECIAL_COST);
    $(`wins-${side}`).innerHTML = `<span class="${f.wins > 0 ? 'won' : ''}"></span><span class="${f.wins > 1 ? 'won' : ''}"></span>`;
    $(`wins-${side}`).setAttribute('aria-label', `${f.name}: ${f.wins} rounds won`);
    $(`special-${side}`).textContent = `${f.special.toUpperCase()} ${f.meter >= SPECIAL_COST ? '• READY' : '• BUILD INK'}`;
  });
  $('timer').textContent = match.training ? '∞' : String(Math.ceil(match.time)).padStart(2, '0');
  $('timer').parentElement.classList.toggle('urgent', !match.training && match.time < 10);
  $('round-number').textContent = match.round;
  if (match.training) updatePractice();
}
const dummyModes = ['stand', 'guard', 'jump', 'cpu'];
function practiceSettings() {
  const t = match.training;
  $('dummy-mode').textContent = `DUMMY: ${t.dummy.toUpperCase()}`;
  for (const [id, key, label] of [['infinite-health', 'infiniteHealth', 'HEALTH RECOVERY'], ['infinite-ink', 'infiniteInk', 'UNLIMITED INK']]) {
    $(id).setAttribute('aria-pressed', String(t[key])); $(id).textContent = `${label}: ${t[key] ? 'ON' : 'OFF'}`;
  }
  renderTutorial();
  $('training-hint').textContent = `${t.tutorial ? 'Guided lesson controls the dummy' : `Dummy: ${t.dummy.toUpperCase()}`} · ${t.infiniteHealth ? 'Health recovers after each string' : 'Knockouts reset the bout'} · ${t.infiniteInk ? 'Unlimited ink' : 'Normal ink costs'}`;
}
function renderTutorial() {
  const g = match?.training?.tutorial, view = g ? lessonView(match, controls.settings.players[0]) : null;
  $('game').classList.toggle('is-guided', !!g);
  for (const root of document.querySelectorAll('[data-lesson-view]')) {
    root.hidden = !view;
    if (!view) continue;
    for (const field of ['title', 'instruction', 'bindings', 'progress', 'status']) {
      const node = root.querySelector(`[data-lesson-${field}]`);
      if (node.textContent !== view[field]) node.textContent = view[field];
    }
    const list = root.querySelector('[data-lesson-goals]'), state = JSON.stringify(view.goals);
    if (list.dataset.state !== state) {
      list.dataset.state = state;
      list.replaceChildren(...view.goals.map(([label, done]) => { const item = document.createElement('li'); item.textContent = `${done ? '✓' : '○'} ${label}`; return item; }));
    }
  }
  for (const button of document.querySelectorAll('[data-tutorial-action]')) {
    const action = button.dataset.tutorialAction;
    if (action === 'start') { button.hidden = !!g && !g.finished; button.textContent = g?.finished ? 'RESTART GUIDED LESSONS' : button.id === 'training-tutorial' ? 'LEARN TO FIGHT' : 'START GUIDED LESSONS'; }
    else {
      button.disabled = !g || (action === 'next' ? !g.ready || g.finished : action !== 'end' && g.finished);
      if (action === 'next') button.textContent = g?.index === 7 ? 'FINISH COURSE →' : 'NEXT LESSON →';
    }
  }
  $('training-reset').textContent = g ? g.finished ? 'RESTART COURSE ↺' : 'RETRY LESSON ↺' : 'RESET ↺';
  $('practice-description').hidden = !!g;
  document.querySelector('.practice-settings').hidden = !!g;
}
function guideAction(action) {
  if (!match?.training) return;
  if (action === 'start') startTutorial(match);
  if (action === 'retry') retryLesson(match);
  if (action === 'next' || action === 'skip') nextLesson(match, action === 'skip');
  if (action === 'end') endTutorial(match);
  clearInput(); practiceSettings(); updateHUD();
  if (match.training.tutorial?.finished) {
    if (!$('training-dialog').open) openPracticeOptions();
    $('training-dialog').querySelector('[data-tutorial-action="end"]').focus();
  } else {
    if ($('training-dialog').open) $('training-dialog').close();
    arena.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
}
document.querySelectorAll('[data-tutorial-action]').forEach(button => button.addEventListener('click', () => guideAction(button.dataset.tutorialAction)));
function updatePractice() {
  const t = match.training, hit = t.lastHit;
  $('practice-hit').textContent = hit ? `${hit.attacker ? 'DUMMY' : 'P1'} ${hit.blocked ? 'BLOCKED' : hit.kind.toUpperCase()} · ${Number(hit.damage.toFixed(1))}` : '—';
  $('practice-combo').textContent = hit && !hit.blocked ? `${hit.hits} ${hit.hits === 1 ? 'HIT' : 'HITS'}` : '—';
  $('practice-damage').textContent = hit && !hit.blocked ? Number(hit.comboDamage.toFixed(1)) : '—';
  const labels = t.inputs.length ? t.inputs : ['Make your first move.'];
  if ($('practice-inputs').textContent !== labels.join('')) $('practice-inputs').replaceChildren(...labels.map(label => { const li = document.createElement('li'); li.textContent = label; return li; }));
  const f = match.fighters[0];
  const timings = ['punch', 'kick', 'throw'].map(kind => `${kind.toUpperCase()} ${Math.ceil(moveFor(f, kind).active * 60)}f`).join(' · ');
  $('practice-timing').textContent = `${combatState(f)} | Startup: ${timings}`;
  const feedback = combatFeedback(t.feedback, controls.settings.players[0]);
  for (const [id, value] of [['feedback-title', feedback.title], ['feedback-detail', feedback.detail]]) if ($(id).textContent !== value) $(id).textContent = value;
  renderTutorial();
}
function resetPractice() {
  if (!match?.training) return;
  if (match.training.tutorial?.finished) startTutorial(match);
  else if (match.training.tutorial) retryLesson(match);
  else resetTraining(match);
  clearInput(); practiceSettings(); updateHUD(); audio.play({ type: 'select' }); arena.focus({ preventScroll: true });
}
function openPracticeOptions() {
  if (!match?.training) return;
  if ($('pause-dialog').open) $('pause-dialog').close();
  paused = true; clearInput(); audio.pause(); practiceSettings(); $('training-dialog').showModal();
  if (match.training.tutorial?.ready && !match.training.tutorial.finished) $('lesson-next-menu').focus();
}
$('training-options').addEventListener('click', openPracticeOptions);
$('training-pause-options').addEventListener('click', openPracticeOptions);
$('training-reset').addEventListener('click', resetPractice);
$('dummy-mode').addEventListener('click', () => {
  match.training.dummy = dummyModes[(dummyModes.indexOf(match.training.dummy) + 1) % dummyModes.length];
  match.ai = { clock: 0, action: {} }; practiceSettings();
});
for (const [id, key] of [['infinite-health', 'infiniteHealth'], ['infinite-ink', 'infiniteInk']]) $(id).addEventListener('click', () => { match.training[key] = !match.training[key]; practiceSettings(); });
function startMatch(bout) {
  if (!celsReady) return;
  for (const id of ['result-dialog', 'pause-dialog', 'help-dialog', 'settings-dialog', 'training-dialog', 'controls-dialog', 'moves-dialog']) if ($(id).open) $(id).close();
  clearInput(); paused = false; match = bout || createMatch(...selection, mode, mode === 'training' ? 'normal' : difficulty, selectedStage);
  presentStage(match.stage);
  $('selection').hidden = $('arcade').hidden = true; $('game').hidden = false;
  $('name-one').textContent = match.fighters[0].name; $('name-two').textContent = match.fighters[1].name;
  $('opponent-tag').textContent = mode === 'training' ? 'DUMMY' : mode !== 'local' ? 'CPU' : 'P2';
  $('p2-controls').hidden = mode !== 'local';
  $('training-panel').hidden = $('training-pause-options').hidden = mode !== 'training';
  $('match-format').textContent = mode === 'training' ? 'TRAINING' : mode === 'arcade' ? `ARCADE ${arcade.index + 1}/6 · ${arcade.difficulty.toUpperCase()}` : mode === 'cpu' ? `BEST OF THREE · ${difficulty.toUpperCase()}` : 'BEST OF THREE';
  $('back-button').textContent = mode === 'arcade' ? '← SAVE & CASTING' : '← CASTING CALL';
  renderTutorial();
  if (match.training) practiceSettings();
  $('match-announcement').textContent = match.training ? `Training. ${match.fighters[0].name} versus ${match.fighters[1].name}.` : `Round one. ${match.fighters[0].name} versus ${match.fighters[1].name}.`;
  updateHUD(); arena.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' });
  audio.setScene('fight'); unlockAudio(); lastPhase = ''; lastRound = 0;
}
function returnToSelection() {
  if (arcade?.status === 'fighting') { arcade.status = 'ready'; saveArcade(); }
  match = null; paused = false; clearInput();
  for (const id of ['result-dialog', 'pause-dialog', 'help-dialog', 'settings-dialog', 'training-dialog', 'controls-dialog', 'moves-dialog']) if ($(id).open) $(id).close();
  audio.setScene('menu');
  $('selection').hidden = false; $('game').hidden = $('arcade').hidden = true; updateSelection(); $('start-button').focus({ preventScroll: true });
}
function pause(reason = 'The projector’s still running. Your fight can wait.') {
  if (!match || paused || match.phase === 'matchover') return;
  paused = true; clearInput(); audio.pause(); $('pause-message').textContent = typeof reason === 'string' ? reason : 'The projector’s still running. Your fight can wait.';
  $('pause-dialog').showModal(); $('resume-button').focus();
}
function resume() { $('pause-dialog').close(); clearInput(); paused = false; audio.setScene('fight'); unlockAudio(); arena.focus({ preventScroll: true }); }
function showResult() {
  if (match.mode === 'arcade') { finishArcade(arcade, match); showArcade(); return; }
  const winner = match.fighters[match.winner];
  $('result-title').textContent = `${winner.short.toUpperCase()} WINS!`;
  $('result-score').textContent = `${match.fighters[0].wins} — ${match.fighters[1].wins} · ${winner.quote}`;
  const context = $('winner-portrait').getContext('2d'); context.clearRect(0, 0, 300, 280);
  drawFighter(context, { ...winner, y: 0, face: 1, vx: 0, attack: null, hurt: 0 }, { x: 140, y: 270, scale: .95, animation: 'victory', progress: 1 });
  $('match-announcement').textContent = `${winner.name} wins the match, ${match.fighters[0].wins} to ${match.fighters[1].wins}.`;
  clearInput(); audio.setScene('menu'); $('result-dialog').showModal(); $('rematch-button').focus();
}
$('start-button').addEventListener('click', startSelected);
$('featured-button').addEventListener('click', () => { if (mode === 'arcade') mode = 'cpu'; selectedStage = 'ink-harbor'; selection[0] = 'mickey'; selection[1] = 'popeye'; updateSelection(); startSelected(); });
$('back-button').addEventListener('click', returnToSelection);
$('pause-button').addEventListener('click', pause);
$('resume-button').addEventListener('click', resume);
$('quit-button').addEventListener('click', returnToSelection);
$('rematch-button').addEventListener('click', () => startMatch());
$('roster-button').addEventListener('click', returnToSelection);
$('pause-dialog').addEventListener('cancel', event => { event.preventDefault(); resume(); });
$('result-dialog').addEventListener('cancel', event => { event.preventDefault(); returnToSelection(); });
$('help-button').addEventListener('click', () => {
  if (match) { paused = true; clearInput(); audio.pause(); }
  $('help-dialog').showModal();
});
for (const name of ['help', 'settings', 'training', 'controls', 'moves']) $(name + '-dialog').addEventListener('close', () => {
  clearInput();
  if (match && !document.querySelector('dialog[open]')) {
    paused = false; audio.setScene(match.phase === 'matchover' ? 'menu' : 'fight'); arena.focus({ preventScroll: true });
  }
});
function openSettings() {
  if (match) { paused = true; clearInput(); audio.pause(); }
  $('settings-dialog').showModal();
}
$('settings-button').addEventListener('click', openSettings);
$('display-pause').addEventListener('click', openSettings);
function refreshControlHints() {
  controls.settings.players.forEach((profile, i) => {
    const root = $(i ? 'p2-controls' : 'p1-controls'), title = document.createElement('b'); title.textContent = `P${i + 1}`;
    const rows = [['left', 'right', 'jump', 'guard'], ['punch', 'kick', 'special', 'throw', 'dash']].map(actions => {
      const span = document.createElement('span');
      for (const action of actions) { const key = document.createElement('kbd'); key.textContent = keyName(profile.keyboard[action]); span.append(key, ` ${ACTIONS[action].toUpperCase()} `); }
      return span;
    });
    root.replaceChildren(title, ...rows);
    $(i ? 'help-controls-two' : 'help-controls-one').textContent = Object.entries(profile.keyboard).map(([action, key]) => `${keyName(key)}: ${ACTIONS[action]}`).join(' · ');
  });
  $('pad-guide').replaceChildren(...controls.settings.players.slice(0, mode === 'local' ? 2 : 1).map((profile, i) => {
    const row = document.createElement('p'); row.textContent = `P${i + 1} CONTROLLER: ${Object.entries(profile.buttons).map(([action, button]) => `${buttonName(button)} ${ACTIONS[action]}`).join(' · ')} · STICK / D-PAD MOVE · START PAUSE`; return row;
  }));
  const profile = controls.settings.players[0];
  $('practice-tip').textContent = `Try Punch → Kick on contact. Throw beats guard; jump over a grounded strike. Reset: ${keyName(profile.keyboard.reset)} or ${buttonName(profile.buttons.reset)} (P1). Open Practice options or pause for move lists.`;
  $('arena').setAttribute('aria-label', `Fighting arena at ${stageFor(match?.stage || preview.stage).name}. Player one: ${Object.entries(profile.keyboard).map(([action, key]) => `${keyName(key)} ${ACTIONS[action]}`).join(', ')}. Escape pauses. Move lists are in the pause menu.`);
}
function openControls() { clearInput(); controls.render(); $('controls-dialog').showModal(); }
$('configure-controls').addEventListener('click', openControls);
$('controls-pause').addEventListener('click', openControls);
function renderMoves() {
  const fighter = ROSTER.find(f => f.id === moveFighter), profile = controls.settings.players[movePlayer];
  $('move-fighter-name').textContent = fighter.name;
  $('move-fighter-role').textContent = `${fighter.style} · P${movePlayer + 1} bindings`;
  document.querySelectorAll('[data-move-fighter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.moveFighter === moveFighter)));
  document.querySelectorAll('[data-move-player]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.movePlayer) === movePlayer)));
  $('move-rows').replaceChildren(...fighterMoves(moveFighter, profile).map(move => {
    const row = document.createElement('tr'), name = document.createElement('th'); name.scope = 'row';
    const title = document.createElement('strong'); title.textContent = move.name;
    const inputs = document.createElement('small'); inputs.textContent = `Key: ${move.keyboard} · Pad: ${move.controller}`;
    const note = document.createElement('small'); note.textContent = move.note; name.append(title, inputs, note);
    const damage = document.createElement('td'); damage.textContent = move.damage;
    const timing = document.createElement('td'); timing.textContent = `${move.startup}f / ${move.recovery}f`; row.append(name, damage, timing); return row;
  }));
  $('move-basics').textContent = ['jump', 'guard', 'dash'].map(action => `${ACTIONS[action]}: ${keyName(profile.keyboard[action])} / ${buttonName(profile.buttons[action])}`).join(' · ') + '. Stick / D-pad Up also jumps; Down also guards. Dash follows your direction and does not make you invincible.';
}
function openMoves() {
  movePlayer = match ? 0 : slot; moveFighter = match ? match.fighters[movePlayer].id : selection[movePlayer];
  if (match) { paused = true; clearInput(); audio.pause(); }
  renderMoves(); $('moves-dialog').showModal();
}
for (const fighter of ROSTER) {
  const button = document.createElement('button'); button.dataset.moveFighter = fighter.id; button.textContent = fighter.short;
  button.addEventListener('click', () => { moveFighter = fighter.id; renderMoves(); }); $('move-fighters').append(button);
}
document.querySelectorAll('[data-move-player]').forEach(button => button.addEventListener('click', () => { movePlayer = Number(button.dataset.movePlayer); moveFighter = match ? match.fighters[movePlayer].id : selection[movePlayer]; renderMoves(); }));
$('moves-button').addEventListener('click', openMoves);
$('moves-pause').addEventListener('click', openMoves);
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => $(button.dataset.close).close()));

window.addEventListener('keydown', event => {
  if (controls.keydown(event)) return;
  if (event.code === 'Escape' && document.fullscreenElement) { if (match && !document.querySelector('dialog[open]')) pause(); return; }
  if (event.code === 'Escape' && !$('arcade').hidden && !document.querySelector('dialog[open]')) { event.preventDefault(); returnToSelection(); return; }
  if (!match || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.code === 'Escape') {
    if (!document.querySelector('dialog[open]')) { event.preventDefault(); pause(); }
    return;
  }
  if (paused || document.querySelector('dialog[open]') || event.target.closest?.('a, button, input')) return;
  if (match.training && controls.settings.players.some(profile => profile.keyboard.reset === event.code)) { event.preventDefault(); resetPractice(); return; }
  if (controls.settings.players.some(profile => Object.entries(profile.keyboard).some(([action, key]) => action !== 'reset' && key === event.code))) {
    event.preventDefault();
    if (!event.repeat && !held.has(event.code)) edges.add(event.code);
    held.add(event.code);
  }
});
window.addEventListener('keyup', event => { held.delete(event.code); });
window.addEventListener('blur', () => { clearInput(); pause(); audio.pause(); });
window.addEventListener('focus', () => { if (!match) audio.setScene('menu'); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { clearInput(); pause(); audio.pause(); } });
document.querySelectorAll('[data-action]').forEach(button => {
  button.addEventListener('pointerdown', event => {
    event.preventDefault(); if (!match || paused) return;
    button.setPointerCapture(event.pointerId); touches.set(event.pointerId, button.dataset.action); touchEdges.add(button.dataset.action);
  });
  const release = event => touches.delete(event.pointerId);
  button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', release);
});

let lastPhase = '', lastRound = 0, portraitFrame = -1, controllerStatus = '';
function pollControllers() {
  let pads = [];
  try { pads = navigator.getGamepads?.() || []; } catch { /* Keyboard play remains available. */ }
  pads = Array.from(pads);
  const state = controllers.poll(pads);
  const status = controllers.slots.map((slot, i) => slot ? `P${i + 1} ${slot.armed ? 'CONTROLLER READY' : 'RELEASE BUTTONS TO JOIN'}` : '').filter(Boolean).join(' · ')
    || (Array.from(pads).some(p => p?.connected) ? 'CONTROLLER MAPPING UNSUPPORTED · KEYBOARD READY' : 'KEYBOARD READY · CONNECT A CONTROLLER & PRESS A BUTTON');
  if (status !== controllerStatus) {
    controllerStatus = status; $('controller-status').textContent = status;
  }
  if (state.disconnected.some(index => match && match.phase !== 'matchover' && (index === 0 || mode === 'local'))) {
    pause('A controller disconnected. Reconnect it or continue with the keyboard. Release held buttons before resuming.'); return;
  }
  const capturing = !!controls.capture; controls.poll(pads);
  if (capturing) return;
  for (const keys of state.menus) {
    const dialog = [...document.querySelectorAll('dialog[open]')].at(-1);
    if (keys.cancel && !dialog && !$('arcade').hidden) { returnToSelection(); return; }
    if (keys.reset && match?.training && !paused && !dialog) { resetPractice(); return; }
    if (keys.pause) {
      if (dialog?.id === 'pause-dialog') resume();
      else if (!dialog && match) pause();
      else if (!match && !dialog) { if (!$('arcade').hidden) playArcade(); else startSelected(); }
      return;
    }
    if (keys.cancel && dialog) { dialog.dispatchEvent(new Event('cancel', { cancelable: true })); if (dialog.open && !['pause-dialog', 'result-dialog'].includes(dialog.id)) dialog.close(); return; }
    if (match && !paused && !dialog) continue;
    const root = dialog || document;
    const buttons = [...root.querySelectorAll('button:not(:disabled), input[type="range"]')].filter(button => button.getClientRects().length && getComputedStyle(button).visibility !== 'hidden');
    const active = document.activeElement;
    if (active?.type === 'range' && (keys.left || keys.right)) {
      active.value = Math.min(Number(active.max), Math.max(Number(active.min), Number(active.value) + Number(active.step) * (keys.right ? 1 : -1))); active.dispatchEvent(new Event('input')); continue;
    }
    const direction = keys.down || keys.right ? 1 : keys.up || keys.left ? -1 : 0;
    if (direction && buttons.length) {
      const index = buttons.indexOf(active);
      buttons[index < 0 ? direction > 0 ? 0 : buttons.length - 1 : (index + direction + buttons.length) % buttons.length].focus();
      audio.play({ type: 'select' });
    }
    if (keys.confirm) { if (buttons.includes(active) && active.tagName === 'BUTTON') active.click(); else buttons[0]?.focus(); return; }
  }
}
function frame(timestamp) {
  const time = timestamp / 1000, delta = Math.min(.05, lastTime ? (timestamp - lastTime) / 1000 : 0);
  lastTime = timestamp;
  pollControllers();
  if (!$('arcade').hidden) {
    const complete = arcade.status === 'complete', id = complete ? arcade.fighter : arcade.ladder[arcade.index];
    const context = $('arcade-portrait').getContext('2d'); context.clearRect(0, 0, 300, 300);
    drawFighter(context, { ...ROSTER.find(f => f.id === id), face: 1, y: 0, vx: 0 }, { x: 140, y: 285, scale: .95, time: effects.reducedMotion ? 0 : time, ...(complete ? { animation: 'victory', progress: effects.reducedMotion ? 1 : (time % 1.2) / 1.2 } : {}) });
  } else if (!match) {
    drawScene(showcaseContext, preview, backgrounds.get(preview.stage), effects.reducedMotion ? 0 : time, { showcase: true, ...effects });
    const pf = effects.reducedMotion ? 0 : Math.floor(time * 12);
    if (pf !== portraitFrame) {
      portraitFrame = pf;
      for (const { context, fighter } of portraits) {
        context.clearRect(0, 0, 320, 300);
        drawFighter(context, { ...fighter, face: 1, y: 0, vx: 0 }, { x: 150, y: 294, scale: fighter.id === 'oswald' ? 1.04 : 1.15, time: effects.reducedMotion ? 0 : time, portrait: true });
      }
    }
  } else {
    // Keep paused pixels; a tutorial can pause after advancing its final frame.
    const drawFrame = !paused;
    if (!paused && match.phase !== 'matchover') {
      accumulator += delta;
      while (accumulator >= 1 / 120) {
        const player = input(0);
        tick(match, [player, match.training ? match.training.tutorial ? tutorialInput(match) : trainingInput(match, 1 / 120) : mode !== 'local' ? cpuInput(match, 1 / 120) : input(1)], 1 / 120);
        const learned = updateTutorial(match, player);
        edges.clear(); touchEdges.clear(); accumulator -= 1 / 120;
        match.events.forEach(event => audio.play(event));
        if (learned) { openPracticeOptions(); break; }
      }
      updateHUD();
      if (match.phase !== lastPhase || match.round !== lastRound) {
        lastPhase = match.phase; lastRound = match.round;
        if (match.phase === 'fight') $('match-announcement').textContent = match.training ? 'Training ready. Practice without a time limit.' : `Round ${match.round}. Fight!`;
        if (match.phase === 'roundover') $('match-announcement').textContent = match.training ? 'Practice knockout. Resetting the bout.' : match.roundWinner === null ? 'Round drawn.' : `${match.fighters[match.roundWinner].name} wins the round.`;
      }
      if (match.phase === 'matchover' && !$('result-dialog').open) showResult();
    }
    if (match && drawFrame) drawScene(arenaContext, match, backgrounds.get(match.stage), match.elapsed, effects);
  }
  requestAnimationFrame(frame);
}

buildRoster(); updateSelection(); soundUI(); updateVisuals(); requestAnimationFrame(frame);
loadArtwork();
