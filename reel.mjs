import { ROSTER } from './engine.mjs';
import { CEL_STATES, loadCels } from './cels.mjs';
import { drawFighter } from './art.mjs';

const $ = id => document.getElementById(id);
const durations = { idle: .8, walk: .6, jump: .8, guard: .65, punch: .32, kick: .48, special: .65, hurt: .3, knockout: .9, victory: 1.2, dash: .3, throw: .6, airpunch: .32, airkick: .48 };
let animation = 'idle', progress = 0, playing = !matchMedia('(prefers-reduced-motion: reduce)').matches, face = 1, ready = false, last = 0;
const cast = ROSTER.map(fighter => {
  const figure = document.createElement('figure');
  figure.innerHTML = `<canvas width="360" height="340" aria-label="${fighter.name} animation"></canvas><figcaption>${fighter.name.toUpperCase()}<small>${fighter.style} · ${fighter.special.toUpperCase()}</small></figcaption>`;
  $('reel-cast').append(figure);
  return { fighter, context: figure.querySelector('canvas').getContext('2d') };
});
for (const name of Object.keys(CEL_STATES)) {
  const button = document.createElement('button'); button.textContent = name.toUpperCase(); button.dataset.animation = name;
  button.addEventListener('click', () => { animation = name; progress = 0; updateControls(); });
  $('animation-controls').append(button);
}
function updateControls() {
  for (const button of $('animation-controls').children) button.setAttribute('aria-pressed', String(button.dataset.animation === animation));
  $('play-toggle').textContent = playing ? 'PAUSE' : 'PLAY';
}
$('play-toggle').addEventListener('click', () => { playing = !playing; updateControls(); });
$('direction-toggle').addEventListener('click', () => {
  face *= -1; $('direction-toggle').setAttribute('aria-pressed', String(face === -1));
  $('direction-toggle').textContent = face === 1 ? 'FACE LEFT' : 'FACE RIGHT';
});
$('cel-scrub').addEventListener('input', event => {
  const index = Number(event.target.value);
  animation = Object.keys(CEL_STATES).find(name => CEL_STATES[name].includes(index));
  progress = (CEL_STATES[animation].indexOf(index) + .01) / CEL_STATES[animation].length;
  playing = false; updateControls();
});
function frame(timestamp) {
  if (ready) {
    if (playing) progress = (progress + Math.min(.05, (timestamp - last) / 1000) / durations[animation]) % 1;
    const frames = CEL_STATES[animation], index = frames[Math.min(frames.length - 1, Math.floor(progress * frames.length))];
    $('cel-number').textContent = String(index + 1).padStart(2, '0'); $('cel-scrub').value = index;
    for (const { fighter, context: c } of cast) {
      c.clearRect(0, 0, 360, 340); c.fillStyle = '#e5dbc3'; c.fillRect(0, 0, 360, 340);
      c.strokeStyle = '#b2a78e'; c.lineWidth = 1; c.beginPath(); c.moveTo(18, 300); c.lineTo(342, 300); c.stroke();
      drawFighter(c, { ...fighter, face }, { x: 175, y: 300, scale: 1, animation, progress });
    }
  }
  last = timestamp; requestAnimationFrame(frame);
}
updateControls(); requestAnimationFrame(frame);
async function loadArtwork() {
  $('reel-retry').hidden = true;
  try {
    await loadCels((done,total) => { $('reel-status').textContent = `Loading animation: ${done} / ${total} checked…`; });
    ready = true; $('reel-status').hidden = true;
  } catch { $('reel-status').textContent = 'Some animation artwork could not load. Retry the missing drawings.'; $('reel-retry').hidden = false; }
}
$('reel-retry').addEventListener('click', loadArtwork);
loadArtwork();
