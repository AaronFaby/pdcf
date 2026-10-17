import { ROSTER, createMatch, tick, cpuInput, SPECIAL_COST } from './engine.mjs';
import { drawFighter, drawScene } from './art.mjs';
import { loadCels } from './cels.mjs';
import { Controllers } from './assets/runtime/controllers.mjs';
import { GameAudio } from './assets/runtime/audio.mjs';

const $ = id => document.getElementById(id);
const selection = ['mickey', 'popeye'];
let slot = 0, mode = 'cpu', match = null, paused = false, accumulator = 0, lastTime = 0;
let preview = createMatch(...selection);
const controllers = new Controllers(), audio = new GameAudio();
let celsReady = false;
const arena = $('arena'), arenaContext = arena.getContext('2d');
const showcaseContext = $('showcase').getContext('2d');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const background = new Image(); background.src = './assets/ink-harbor.png';
const held = new Set(), edges = new Set(), touches = new Map(), touchEdges = new Set();
const keymaps = [
  { left: 'KeyA', right: 'KeyD', jump: 'KeyW', guard: 'KeyS', punch: 'KeyF', kick: 'KeyG', special: 'KeyH', throw: 'KeyR', dash: 'ShiftLeft' },
  { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', guard: 'ArrowDown', punch: 'KeyJ', kick: 'KeyK', special: 'KeyL', throw: 'KeyI', dash: 'ShiftRight' }
];
const gameKeys = new Set(keymaps.flatMap(Object.values));
const portraits = [];

function clearInput() {
  held.clear(); edges.clear(); touches.clear(); touchEdges.clear(); controllers.clear(); accumulator = 0;
  for (const fighter of match?.fighters || []) fighter.buffer = null;
}
function input(index) {
  const result = controllers.consume(index);
  for (const [action, key] of Object.entries(keymaps[index])) {
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
function unlockAudio() {
  const pending = audio.unlock();
  $('audio-unlock').hidden = !audio.settings.enabled || (audio.context?.state === 'running' && !audio.error);
  pending.then(() => {
    $('audio-unlock').hidden = !audio.settings.enabled || (audio.context?.state === 'running' && !audio.error);
    $('audio-status').textContent = audio.error ? 'Sound could not start. Check your connection, then press Enable audio to try again.' : audio.context?.state === 'running' ? 'Ink Harbor Stomp · Original 32-bar swing arrangement' : 'Press Enable audio to let the band play.';
  });
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
  preview = createMatch(...selection);
  preview.fighters[0].x = 365; preview.fighters[1].x = 835;
  const current = ROSTER.find(f => f.id === selection[slot]);
  $('detail-title').textContent = current.title.toUpperCase();
  $('detail-quote').textContent = current.quote;
  $('detail-special').textContent = current.special;
  $('preview-name-one').textContent = ROSTER.find(f => f.id === selection[0]).name.toUpperCase();
  $('preview-name-two').textContent = ROSTER.find(f => f.id === selection[1]).name.toUpperCase();
  $('opponent-label').textContent = mode === 'cpu' ? 'CPU OPPONENT' : 'PLAYER TWO';
  for (const button of document.querySelectorAll('.fighter-card')) {
    const id = button.dataset.fighter, chosen = selection[0] === id, opponent = selection[1] === id;
    button.classList.toggle('selected', chosen); button.classList.toggle('opponent-selected', opponent);
    button.setAttribute('aria-pressed', String(selection[slot] === id));
    button.setAttribute('aria-label', `${ROSTER.find(f => f.id === id).name}, ${ROSTER.find(f => f.id === id).style.toLowerCase()}${chosen ? ', player one' : ''}${opponent ? ', opponent' : ''}. Select for ${slot ? 'opponent' : 'player one'}.`);
    button.querySelector('.card-selection').innerHTML = `${chosen ? '<span class="badge">P1</span>' : ''}${opponent ? `<span class="badge opponent">${mode === 'cpu' ? 'CPU' : 'P2'}</span>` : ''}`;
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
document.querySelectorAll('.mode').forEach(button => button.addEventListener('click', () => { mode = button.dataset.mode; updateSelection(); }));

function updateHUD() {
  match.fighters.forEach((f, i) => {
    const side = i ? 'two' : 'one';
    $(`health-${side}`).firstElementChild.style.width = f.hp + '%';
    $(`health-${side}`).setAttribute('aria-valuenow', String(Math.round(f.hp)));
    $(`meter-${side}`).firstElementChild.style.width = f.meter + '%';
    $(`meter-${side}`).classList.toggle('ready', f.meter >= SPECIAL_COST);
    $(`wins-${side}`).innerHTML = `<span class="${f.wins > 0 ? 'won' : ''}"></span><span class="${f.wins > 1 ? 'won' : ''}"></span>`;
    $(`wins-${side}`).setAttribute('aria-label', `${f.name}: ${f.wins} rounds won`);
    $(`special-${side}`).textContent = `${f.special.toUpperCase()} ${f.meter >= SPECIAL_COST ? '• READY' : '• BUILD INK'}`;
  });
  $('timer').textContent = String(Math.ceil(match.time)).padStart(2, '0');
  $('timer').parentElement.classList.toggle('urgent', match.time < 10);
  $('round-number').textContent = match.round;
}
function startMatch() {
  if (!celsReady) return;
  for (const id of ['result-dialog', 'pause-dialog', 'help-dialog', 'settings-dialog']) if ($(id).open) $(id).close();
  clearInput(); paused = false; match = createMatch(...selection, mode);
  $('selection').hidden = true; $('game').hidden = false;
  $('name-one').textContent = match.fighters[0].name; $('name-two').textContent = match.fighters[1].name;
  $('opponent-tag').textContent = mode === 'cpu' ? 'CPU' : 'P2';
  $('p2-controls').hidden = mode === 'cpu';
  $('match-announcement').textContent = `Round one. ${match.fighters[0].name} versus ${match.fighters[1].name}.`;
  updateHUD(); arena.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' });
  audio.setScene('fight'); unlockAudio(); lastPhase = ''; lastRound = 0;
}
function returnToSelection() {
  match = null; paused = false; clearInput();
  for (const id of ['result-dialog', 'pause-dialog', 'help-dialog', 'settings-dialog']) if ($(id).open) $(id).close();
  audio.setScene('menu');
  $('selection').hidden = false; $('game').hidden = true; $('start-button').focus({ preventScroll: true });
}
function pause(reason = 'The projector’s still running. Your fight can wait.') {
  if (!match || paused || match.phase === 'matchover') return;
  paused = true; clearInput(); audio.pause(); $('pause-message').textContent = typeof reason === 'string' ? reason : 'The projector’s still running. Your fight can wait.';
  $('pause-dialog').showModal(); $('resume-button').focus();
}
function resume() { $('pause-dialog').close(); clearInput(); paused = false; audio.setScene('fight'); unlockAudio(); arena.focus({ preventScroll: true }); }
function showResult() {
  const winner = match.fighters[match.winner];
  $('result-title').textContent = `${winner.short.toUpperCase()} WINS!`;
  $('result-score').textContent = `${match.fighters[0].wins} — ${match.fighters[1].wins} · ${winner.quote}`;
  const context = $('winner-portrait').getContext('2d'); context.clearRect(0, 0, 300, 280);
  drawFighter(context, { ...winner, y: 0, face: 1, vx: 0, attack: null, hurt: 0 }, { x: 140, y: 270, scale: .95, animation: 'victory', progress: 1 });
  $('match-announcement').textContent = `${winner.name} wins the match, ${match.fighters[0].wins} to ${match.fighters[1].wins}.`;
  clearInput(); audio.setScene('menu'); $('result-dialog').showModal(); $('rematch-button').focus();
}
$('start-button').addEventListener('click', startMatch);
$('featured-button').addEventListener('click', () => { selection[0] = 'mickey'; selection[1] = 'popeye'; updateSelection(); startMatch(); });
$('back-button').addEventListener('click', returnToSelection);
$('pause-button').addEventListener('click', pause);
$('resume-button').addEventListener('click', resume);
$('quit-button').addEventListener('click', returnToSelection);
$('rematch-button').addEventListener('click', startMatch);
$('roster-button').addEventListener('click', returnToSelection);
$('pause-dialog').addEventListener('cancel', event => { event.preventDefault(); resume(); });
$('result-dialog').addEventListener('cancel', event => { event.preventDefault(); returnToSelection(); });
$('help-button').addEventListener('click', () => {
  if (match) { paused = true; clearInput(); audio.pause(); }
  $('help-dialog').showModal();
});
for (const name of ['help', 'settings']) $(name + '-dialog').addEventListener('close', () => {
  clearInput();
  if (match && !$('pause-dialog').open && !$('help-dialog').open && !$('settings-dialog').open) {
    paused = false; audio.setScene(match.phase === 'matchover' ? 'menu' : 'fight'); arena.focus({ preventScroll: true });
  }
});
$('settings-button').addEventListener('click', () => {
  if (match) { paused = true; clearInput(); audio.pause(); }
  $('settings-dialog').showModal();
});
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => $(button.dataset.close).close()));

window.addEventListener('keydown', event => {
  if (!match || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.code === 'Escape') {
    if (!document.querySelector('dialog[open]')) { event.preventDefault(); pause(); }
    return;
  }
  if (paused || document.querySelector('dialog[open]')) return;
  if (gameKeys.has(event.code)) {
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
  const state = controllers.poll(pads);
  const status = controllers.slots.map((slot, i) => slot ? `P${i + 1} ${slot.armed ? 'CONTROLLER READY' : 'RELEASE BUTTONS TO JOIN'}` : '').filter(Boolean).join(' · ')
    || (Array.from(pads).some(p => p?.connected) ? 'CONTROLLER MAPPING UNSUPPORTED · KEYBOARD READY' : 'KEYBOARD READY · CONNECT A CONTROLLER & PRESS A BUTTON');
  if (status !== controllerStatus) {
    controllerStatus = status; $('controller-status').textContent = status;
  }
  if (state.disconnected.some(index => match && match.phase !== 'matchover' && (index === 0 || mode === 'local'))) {
    pause('A controller disconnected. Reconnect it or continue with the keyboard. Release held buttons before resuming.'); return;
  }
  for (const keys of state.menus) {
    const dialog = document.querySelector('dialog[open]');
    if (keys.pause) {
      if (dialog?.id === 'pause-dialog') resume();
      else if (!dialog && match) pause();
      else if (!match && !dialog) startMatch();
      return;
    }
    if (keys.cancel && dialog) { dialog.dispatchEvent(new Event('cancel', { cancelable: true })); if (dialog.open && !['pause-dialog', 'result-dialog'].includes(dialog.id)) dialog.close(); return; }
    if (match && !paused && !dialog) continue;
    const root = dialog || document;
    const buttons = [...root.querySelectorAll('button:not(:disabled), input[type="range"]')].filter(button => button.getClientRects().length);
    const active = document.activeElement;
    if (active?.type === 'range' && (keys.left || keys.right)) {
      active.value = Math.min(100, Math.max(0, Number(active.value) + (keys.right ? 5 : -5))); active.dispatchEvent(new Event('input')); continue;
    }
    const direction = keys.down || keys.right ? 1 : keys.up || keys.left ? -1 : 0;
    if (direction && buttons.length) {
      const index = buttons.indexOf(active);
      buttons[index < 0 ? direction > 0 ? 0 : buttons.length - 1 : (index + direction + buttons.length) % buttons.length].focus();
      audio.play({ type: 'select' });
    }
    if (keys.confirm) { if (buttons.includes(active) && active.tagName === 'BUTTON') active.click(); else buttons[0]?.focus(); }
  }
}
function frame(timestamp) {
  const time = timestamp / 1000, delta = Math.min(.05, lastTime ? (timestamp - lastTime) / 1000 : 0);
  lastTime = timestamp;
  pollControllers();
  if (!match) {
    drawScene(showcaseContext, preview, background, reducedMotion.matches ? 0 : time, { showcase: true, reducedMotion: reducedMotion.matches });
    const pf = reducedMotion.matches ? 0 : Math.floor(time * 12);
    if (pf !== portraitFrame) {
      portraitFrame = pf;
      for (const { context, fighter } of portraits) {
        context.clearRect(0, 0, 320, 300);
        drawFighter(context, { ...fighter, face: 1, y: 0, vx: 0 }, { x: 150, y: 294, scale: fighter.id === 'oswald' ? 1.04 : 1.15, time: reducedMotion.matches ? 0 : time, portrait: true });
      }
    }
  } else {
    if (!paused && match.phase !== 'matchover') {
      accumulator += delta;
      while (accumulator >= 1 / 120) {
        tick(match, [input(0), mode === 'cpu' ? cpuInput(match, 1 / 120) : input(1)], 1 / 120);
        edges.clear(); touchEdges.clear(); accumulator -= 1 / 120;
        match.events.forEach(event => audio.play(event));
      }
      updateHUD();
      if (match.phase !== lastPhase || match.round !== lastRound) {
        lastPhase = match.phase; lastRound = match.round;
        if (match.phase === 'fight') $('match-announcement').textContent = `Round ${match.round}. Fight!`;
        if (match.phase === 'roundover') $('match-announcement').textContent = match.roundWinner === null ? 'Round drawn.' : `${match.fighters[match.roundWinner].name} wins the round.`;
      }
      if (match.phase === 'matchover' && !$('result-dialog').open) showResult();
    }
    drawScene(arenaContext, match, background, match.elapsed, { reducedMotion: reducedMotion.matches });
  }
  requestAnimationFrame(frame);
}

buildRoster(); updateSelection(); soundUI(); requestAnimationFrame(frame);
loadCels().then(() => {
  celsReady = true;
  $('start-button').disabled = false;
  $('featured-button').disabled = false;
  $('art-status').hidden = true;
}).catch(error => {
  $('art-status').textContent = 'The animation artwork could not load. Refresh this page to try again.';
  console.error('Cel artwork failed to load:', error);
});
