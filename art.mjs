import { FLOOR } from './engine.mjs';
import { drawCel } from './cels.mjs';

const INK = '#24231f', PAPER = '#f4ecd9';
function ellipse(c, x, y, rx, ry, fill = PAPER, angle = 0) {
  c.beginPath(); c.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2);
  c.fillStyle = fill; c.fill(); c.stroke();
}
function path(c, points, fill = PAPER) {
  c.beginPath();
  for (const [i, p] of points.entries()) i ? c.lineTo(...p) : c.moveTo(...p);
  c.closePath(); c.fillStyle = fill; c.fill(); c.stroke();
}
export function drawFighter(c, f, { x = f.x, y = FLOOR + f.y, scale = 1, time = 0, ...animation } = {}) {
  if (f.buff > 0) {
    c.save(); c.translate(x, y); c.scale(scale, scale);
    c.strokeStyle = '#b88432'; c.lineWidth = 3;
    const heldTime = Math.floor(time * 12) / 12;
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2 + heldTime;
      c.beginPath(); c.moveTo(Math.cos(a) * 75, -100 + Math.sin(a) * 110);
      c.lineTo(Math.cos(a) * 88, -100 + Math.sin(a) * 126); c.stroke();
    }
    c.restore();
  }
  drawCel(c, f, { x, y, scale, time, ...animation });
}

export function drawBackdrop(c, image, time = 0) {
  if (image?.complete && image.naturalWidth) {
    const ratio = Math.max(1200 / image.naturalWidth, 675 / image.naturalHeight);
    const w = image.naturalWidth * ratio, h = image.naturalHeight * ratio;
    c.drawImage(image, (1200 - w) / 2, (675 - h) / 2, w, h);
    c.fillStyle = 'rgba(244,236,217,.08)'; c.fillRect(0, 0, 1200, 675);
  } else {
    c.fillStyle = '#c5beaa'; c.fillRect(0, 0, 1200, 675);
    c.fillStyle = '#eee6d2'; c.beginPath(); c.arc(840, 130, 66, 0, 7); c.fill();
    for (let i = 0; i < 13; i++) {
      const h = 55 + ((i * 53) % 100);
      c.fillStyle = i % 2 ? '#8f8d7d' : '#a09d8c'; c.fillRect(i * 100, 350 - h, 76, h);
    }
    c.fillStyle = '#a7aa9a'; c.fillRect(0, 350, 1200, 200);
    c.strokeStyle = '#d6d2bd'; c.lineWidth = 2;
    for (let i = 0; i < 32; i++) { const x = ((i * 173 + time * 10) % 1300) - 50; c.beginPath(); c.moveTo(x, 370 + i % 7 * 20); c.lineTo(x + 45, 370 + i % 7 * 20); c.stroke(); }
    c.fillStyle = '#726b58'; c.fillRect(0, 530, 1200, 145);
    c.strokeStyle = '#494737'; c.lineWidth = 3;
    for (let i = 0; i < 14; i++) { c.beginPath(); c.moveTo(i * 100 - 60, 530); c.lineTo(i * 115 - 135, 675); c.stroke(); }
    for (let y = 535; y < 675; y += 30) { c.beginPath(); c.moveTo(0, y); c.lineTo(1200, y); c.stroke(); }
  }
  const vignette = c.createRadialGradient(600, 300, 150, 600, 320, 760);
  vignette.addColorStop(0, 'rgba(20,18,14,0)'); vignette.addColorStop(1, 'rgba(20,18,14,.45)');
  c.fillStyle = vignette; c.fillRect(0, 0, 1200, 675);
}

export function drawScene(c, match, image, time, { showcase = false, reducedMotion = false } = {}) {
  c.clearRect(0, 0, 1200, 675);
  drawBackdrop(c, image, time);
  const fighters = match.fighters;
  if (!showcase) {
    c.fillStyle = 'rgba(244,236,217,.72)';
    c.fillRect(0, 0, 1200, 118);
  }
  for (const [index, f] of fighters.entries()) {
    c.save(); c.fillStyle = 'rgba(28,26,20,.22)';
    c.beginPath(); c.ellipse(f.x, FLOOR + 6, Math.max(25, 61 + f.y * .1), 12, 0, 0, 7); c.fill(); c.restore();
    const finishedRound = !showcase && (match.phase === 'roundover' || match.phase === 'matchover');
    const endTime = match.phase === 'matchover' ? 2.2 : 2.2 - match.phaseTime;
    drawFighter(c, f, {
      time, scale: 1.15, reducedMotion,
      defeatTime: finishedRound && f.hp <= 0 ? endTime : undefined,
      victoryTime: finishedRound && match.roundWinner === index ? endTime : undefined
    });
  }
  for (const p of match.projectiles) {
    c.save(); c.translate(p.x, FLOOR + p.y); c.strokeStyle = INK; c.lineWidth = 4;
    if (p.kind === 'betty') {
      for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(0, 0, 13 + i * 9, 23 + i * 8, 0, -.8, .8); c.stroke(); }
      c.font = 'bold 30px Georgia'; c.fillStyle = INK; c.fillText('♪', -12, 10);
    } else if (p.kind === 'felix') {
      for (let i = 0; i < 5; i++) ellipse(c, Math.cos(i * 1.3 + time * 5) * 9, Math.sin(i * 1.3 + time * 5) * 9, 13, 11, INK);
    } else {
      for (let i = 0; i < 3; i++) ellipse(c, (i - 1) * 12, Math.sin(time * 10 + i) * 8, 19, 17, PAPER);
    }
    c.restore();
  }
  for (const e of match.effects) {
    c.save(); c.translate(e.x, e.y); c.scale(1 + (e.max - e.life) * .7, 1 + (e.max - e.life) * .7);
    c.globalAlpha = Math.min(1, e.life * 6); c.lineWidth = 3; c.strokeStyle = INK;
    if (e.text !== 'SPINACH!') {
      const pts = Array.from({ length: 18 }, (_, i) => { const a = i / 18 * Math.PI * 2, r = i % 2 ? 32 : 52; return [Math.cos(a) * r, Math.sin(a) * r * .65]; });
      path(c, pts, e.blocked ? PAPER : '#e6bd58');
    }
    c.fillStyle = INK; c.textAlign = 'center'; c.font = 'italic bold 22px Georgia'; c.fillText(e.text, 0, 7); c.restore();
  }
  if (!showcase && match.phase !== 'fight') {
    let label = '';
    if (match.phase === 'countdown') label = match.phaseTime > 1.45 ? `ROUND ${match.round}` : match.phaseTime > .65 ? 'READY?' : 'FIGHT!';
    if (match.phase === 'roundover') label = match.roundWinner === null ? 'A DRAW!' : match.time <= 0 ? 'TIME!' : 'KNOCKOUT!';
    if (label) {
      c.save(); c.translate(600, 290); c.rotate(-.04);
      c.fillStyle = PAPER; c.fillRect(-280, -53, 560, 100);
      c.strokeStyle = INK; c.lineWidth = 4; c.strokeRect(-287, -60, 574, 114);
      c.font = 'italic bold 66px Georgia'; c.textAlign = 'center'; c.fillStyle = INK; c.fillText(label, 0, 22); c.restore();
    }
  }
  // Film texture stays static when reduced motion is requested.
  if (!reducedMotion) {
    c.save(); c.globalAlpha = .07; c.fillStyle = INK;
    const frame = Math.floor(time * 12);
    for (let i = 0; i < 70; i++) c.fillRect((i * 197 + frame * 41) % 1200, (i * 139 + frame * 19) % 675, i % 4 === 0 ? 1 : 2, i % 4 === 0 ? 20 : 2);
    c.restore();
  }
}
