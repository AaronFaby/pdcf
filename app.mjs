import { ROSTER, createMatch, tick, cpuInput, SPECIAL_COST } from './engine.mjs';
import { drawFighter, drawScene } from './art.mjs';

const $ = id => document.getElementById(id);
const selection = ['mickey', 'popeye'];
let slot = 0, mode = 'cpu', match = null, paused = false, accumulator = 0, lastTime = 0;
let preview = createMatch(...selection), soundOn = false, audio = null;
const arena = $('arena'), arenaContext = arena.getContext('2d');
const showcaseContext = $('showcase').getContext('2d');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const background = new Image(); background.src = './assets/ink-harbor.png';
const held = new Set(), edges = new Set(), touches = new Map(), touchEdges = new Set();
const keymaps = [
  { left: 'KeyA', right: 'KeyD', jump: 'KeyW', guard: 'KeyS', punch: 'KeyF', kick: 'KeyG', special: 'KeyH' },
  { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', guard: 'ArrowDown', punch: 'KeyJ', kick: 'KeyK', special: 'KeyL' }
];
const gameKeys = new Set(keymaps.flatMap(Object.values));
const portraits = [];

function clearInput() { held.clear(); edges.clear(); touches.clear(); touchEdges.clear(); accumulator = 0; }
function input(index) {
  const result = {};
  for (const [action, key] of Object.entries(keymaps[index])) {
    const continuous = ['left', 'right', 'guard'].includes(action);
    result[action] = (continuous ? held : edges).has(key) || (index === 0 && (continuous ? [...touches.values()].includes(action) : touchEdges.has(action)));
  }
  return result;
}

function tone(frequency, length = .1, type = 'triangle', volume = .06, delay = 0, endFrequency = frequency) {
  if (!soundOn) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    const start = audio.currentTime + delay, oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + length);
    gain.gain.setValueAtTime(volume, start); gain.gain.exponentialRampToValueAtTime(.001, start + length);
    oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(start); oscillator.stop(start + length);
  } catch { /* Audio remains optional on browsers without an audio context. */ }
}
function playEvent(event) {
  if (event.type === 'hit') tone(event.heavy ? 110 : 180, .14, 'square', .04, 0, 35);
  if (event.type === 'block') tone(450, .08, 'triangle', .06, 0, 180);
  if (event.type === 'swing') tone(230, .07, 'triangle', .02, 0, 110);
  if (event.type === 'bell') { tone(880, .45, 'sine'); tone(1320, .4, 'sine', .025); }
  if (event.type === 'ko') [523, 659, 784, 1047].forEach((n, i) => tone(n, .25, 'triangle', .045, i * .1));
}
$('sound-button').addEventListener('click', () => {
  soundOn = !soundOn;
  $('sound-button').setAttribute('aria-pressed', String(soundOn));
  $('sound-button').setAttribute('aria-label', `Turn sound ${soundOn ? 'off' : 'on'}`);
  $('sound-button').title = `Turn sound ${soundOn ? 'off' : 'on'}`;
  $('sound-button').querySelector('.sound-state').textContent = soundOn ? 'ON' : 'OFF';
  if (soundOn) tone(660, .12);
});

function buildRoster() {
  for (const f of ROSTER) {
    const button = document.createElement('button');
    button.className = 'fighter-card'; button.dataset.fighter = f.id;
    button.innerHTML = `<div class="portrait-wrap"><span class="card-year">${f.year}</span><span class="card-selection"></span><canvas width="320" height="300" aria-hidden="true"></canvas></div><div class="card-caption"><strong>${f.name.toUpperCase()}</strong><small>${f.style}</small></div>`;
    button.addEventListener('click', () => { selection[slot] = f.id; updateSelection(); tone(440 + ROSTER.indexOf(f) * 55, .06); });
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
  for (const id of ['result-dialog', 'pause-dialog', 'help-dialog']) if ($(id).open) $(id).close();
  clearInput(); paused = false; match = createMatch(...selection, mode);
  $('selection').hidden = true; $('game').hidden = false;
  $('name-one').textContent = match.fighters[0].name; $('name-two').textContent = match.fighters[1].name;
  $('opponent-tag').textContent = mode === 'cpu' ? 'CPU' : 'P2';
  $('p2-controls').hidden = mode === 'cpu';
  $('match-announcement').textContent = `Round one. ${match.fighters[0].name} versus ${match.fighters[1].name}.`;
  updateHUD(); arena.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' });
  tone(330, .1);
}
function returnToSelection() {
  match = null; paused = false; clearInput();
  for (const id of ['result-dialog', 'pause-dialog', 'help-dialog']) if ($(id).open) $(id).close();
  $('selection').hidden = false; $('game').hidden = true; $('start-button').focus({ preventScroll: true });
}
function pause() {
  if (!match || paused || match.phase === 'matchover') return;
  paused = true; clearInput(); $('pause-dialog').showModal(); $('resume-button').focus();
}
function resume() { $('pause-dialog').close(); clearInput(); paused = false; arena.focus({ preventScroll: true }); }
function showResult() {
  const winner = match.fighters[match.winner];
  $('result-title').textContent = `${winner.short.toUpperCase()} WINS!`;
  $('result-score').textContent = `${match.fighters[0].wins} — ${match.fighters[1].wins} · ${winner.quote}`;
  const context = $('winner-portrait').getContext('2d'); context.clearRect(0, 0, 300, 280);
  drawFighter(context, { ...winner, y: 0, face: 1, vx: 0, attack: null, hurt: 0 }, { x: 140, y: 270, scale: 1.05, time: 0, portrait: true });
  $('match-announcement').textContent = `${winner.name} wins the match, ${match.fighters[0].wins} to ${match.fighters[1].wins}.`;
  clearInput(); $('result-dialog').showModal(); $('rematch-button').focus();
}
$('start-button').addEventListener('click', startMatch);
$('back-button').addEventListener('click', returnToSelection);
$('pause-button').addEventListener('click', pause);
$('resume-button').addEventListener('click', resume);
$('quit-button').addEventListener('click', returnToSelection);
$('rematch-button').addEventListener('click', startMatch);
$('roster-button').addEventListener('click', returnToSelection);
$('pause-dialog').addEventListener('cancel', event => { event.preventDefault(); resume(); });
$('result-dialog').addEventListener('cancel', event => { event.preventDefault(); returnToSelection(); });
$('help-button').addEventListener('click', () => {
  if (match) { paused = true; clearInput(); }
  $('help-dialog').showModal();
});
$('help-dialog').addEventListener('close', () => { if (match && !$('pause-dialog').open) { clearInput(); paused = false; arena.focus({ preventScroll: true }); } });
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
    if (!held.has(event.code)) edges.add(event.code);
    held.add(event.code);
  }
});
window.addEventListener('keyup', event => { held.delete(event.code); });
window.addEventListener('blur', () => { clearInput(); pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { clearInput(); pause(); } });
document.querySelectorAll('[data-action]').forEach(button => {
  button.addEventListener('pointerdown', event => {
    event.preventDefault(); if (!match || paused) return;
    button.setPointerCapture(event.pointerId); touches.set(event.pointerId, button.dataset.action); touchEdges.add(button.dataset.action);
  });
  const release = event => touches.delete(event.pointerId);
  button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', release);
});

let lastPhase = '', lastRound = 0, portraitFrame = -1;
function frame(timestamp) {
  const time = timestamp / 1000, delta = Math.min(.05, lastTime ? (timestamp - lastTime) / 1000 : 0);
  lastTime = timestamp;
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
        match.events.forEach(playEvent);
      }
      updateHUD();
      if (match.phase !== lastPhase || match.round !== lastRound) {
        lastPhase = match.phase; lastRound = match.round;
        if (match.phase === 'fight') $('match-announcement').textContent = `Round ${match.round}. Fight!`;
        if (match.phase === 'roundover') $('match-announcement').textContent = match.roundWinner === null ? 'Round drawn.' : `${match.fighters[match.roundWinner].name} wins the round.`;
      }
      if (match.phase === 'matchover' && !$('result-dialog').open) showResult();
    }
    drawScene(arenaContext, match, background, paused ? match.elapsed : time, { reducedMotion: reducedMotion.matches });
  }
  requestAnimationFrame(frame);
}

buildRoster(); updateSelection(); requestAnimationFrame(frame);
