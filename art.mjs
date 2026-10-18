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

export function drawBackdrop(c, image, time = 0, stage = 'ink-harbor') {
  if (image?.complete && image.naturalWidth) {
    const ratio = Math.max(1200 / image.naturalWidth, 675 / image.naturalHeight);
    const w = image.naturalWidth * ratio, h = image.naturalHeight * ratio;
    c.drawImage(image, (1200 - w) / 2, (675 - h) / 2, w, h);
    c.fillStyle = 'rgba(244,236,217,.08)'; c.fillRect(0, 0, 1200, 675);
  } else if (stage !== 'ink-harbor') {
    c.fillStyle = stage === 'silverscreen-theater' ? '#b3a58b' : '#81857f'; c.fillRect(0, 0, 1200, 675);
    c.fillStyle = '#aaa18b'; c.fillRect(0, 510, 1200, 165);
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
  const exposure = Math.floor(time * 12) / 12;
  if (stage === 'silverscreen-theater') drawTheaterLife(c, exposure);
  else if (stage === 'moonlight-midway') drawMidwayLife(c, exposure);
  else if (stage === 'midnight-junction') drawJunctionLife(c, exposure);
  else drawHarborLife(c, exposure);
  const vignette = c.createRadialGradient(600, 300, 150, 600, 320, 760);
  vignette.addColorStop(0, 'rgba(20,18,14,0)'); vignette.addColorStop(1, 'rgba(20,18,14,.45)');
  c.fillStyle = vignette; c.fillRect(0, 0, 1200, 675);
}

function drawTheaterLife(c, time) {
  c.save();
  // Soft beams and a silent-picture iris stay behind the actors and fighting floor.
  for (let i = 0; i < 2; i++) {
    const x = i ? 1090 : 110, center = 600 + Math.sin(time * .32 + i * 2) * 235;
    const beam = c.createLinearGradient(x, 65, center, 510);
    beam.addColorStop(0, 'rgba(255,243,204,.015)'); beam.addColorStop(1, 'rgba(255,243,204,.12)');
    c.beginPath(); c.moveTo(x, 65); c.lineTo(center - 125, 510); c.lineTo(center + 125, 510); c.closePath(); c.fillStyle = beam; c.fill();
  }
  c.globalAlpha = .07 + Math.sin(time * 6) * .012;
  c.fillStyle = '#fff6da'; c.fillRect(441, 180, 313, 173);
  c.globalAlpha = .12; c.strokeStyle = '#655e4a'; c.lineWidth = 1;
  c.beginPath(); c.ellipse(598, 266, 61 + Math.sin(time * .6) * 8, 61, 0, 0, Math.PI * 2); c.stroke();
  for (let i = 0; i < 8; i++) {
    const a = time * .24 + i * Math.PI / 4;
    c.beginPath(); c.arc(598 + Math.cos(a) * 39, 266 + Math.sin(a) * 39, 8, 0, 7); c.stroke();
  }
  c.globalAlpha = .18; c.fillStyle = '#29251f';
  for (let i = 0; i < 2; i++) {
    c.beginPath(); c.moveTo(i ? 1200 : 0, 0);
    c.bezierCurveTo(i ? 1150 : 50, 150, i ? 1193 - Math.sin(time * .7) * 9 : 7 + Math.sin(time * .7) * 9, 370, i ? 1190 : 10, 510);
    c.lineTo(i ? 1200 : 0, 510); c.closePath(); c.fill();
  }
  for (let i = 0; i < 13; i++) {
    const x = 90 + i * 85, glow = c.createRadialGradient(x, 509, 0, x, 509, 24);
    glow.addColorStop(0, `rgba(255,232,180,${.12 + (Math.sin(time * 1.2 + i) + 1) * .035})`); glow.addColorStop(1, 'rgba(255,232,180,0)');
    c.globalAlpha = 1; c.fillStyle = glow; c.fillRect(x - 24, 485, 48, 48);
  }
  c.globalAlpha = .28; c.fillStyle = '#f4ecd9';
  for (let i = 0; i < 16; i++) {
    const x = 300 + (i * 91 + Math.sin(time * .2 + i) * 20) % 600, y = 140 + (i * 47 + time * (2 + i % 3)) % 335;
    c.beginPath(); c.arc(x, y, 1.1, 0, 7); c.fill();
  }
  c.restore();
}

function drawMidwayLife(c, time) {
  c.save(); c.strokeStyle = '#b6ae97'; c.fillStyle = '#6b6a61'; c.lineWidth = 2;
  const x = 394, y = 213, radius = 128;
  c.globalAlpha = .85;
  path(c, [[x - 48, 399], [x - 8, y], [x + 8, y], [x + 48, 399]], '#777467');
  c.beginPath(); c.arc(x, y, radius, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.arc(x, y, radius - 7, 0, Math.PI * 2); c.stroke();
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6 + time * .075, px = x + Math.cos(a) * radius, py = y + Math.sin(a) * radius;
    c.beginPath(); c.moveTo(x, y); c.lineTo(px, py); c.stroke();
    // Gondolas hang upright while the wheel rotates.
    c.fillStyle = i % 2 ? '#b4aa90' : '#8f8978'; c.fillRect(px - 10, py + 1, 20, 13); c.strokeRect(px - 10, py + 1, 20, 13);
    c.fillStyle = '#ece0b9'; c.beginPath(); c.arc(px, py - 2, 2, 0, 7); c.fill();
  }
  c.fillStyle = '#e1d6b3'; c.beginPath(); c.arc(x, y, 8, 0, 7); c.fill();
  for (let i = 0; i < 3; i++) {
    const bx = 865 + i * 25 + Math.sin(time * .7 + i) * 7, by = 248 - i * 25 + Math.cos(time * .65 + i) * 6;
    c.strokeStyle = '#b5aa8b'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(895, 416); c.quadraticCurveTo(bx + 12, 330, bx, by + 15); c.stroke();
    c.fillStyle = i % 2 ? '#d5c5a0' : '#888b80'; c.beginPath(); c.ellipse(bx, by, 11, 15, -.15, 0, 7); c.fill(); c.stroke();
  }
  for (let i = 0; i < 15; i++) {
    const px = 963 + i * 16, py = 275 - Math.sin(i / 14 * Math.PI) * 10;
    c.globalAlpha = .25 + (Math.sin(time * 2 - i * .8) + 1) * .3;
    c.fillStyle = '#fff0bc'; c.beginPath(); c.arc(px, py, 2.6, 0, 7); c.fill();
  }
  c.restore();
}

function drawJunctionLife(c, time) {
  c.save(); c.strokeStyle = '#383b36'; c.lineWidth = 2;
  // A long passing train runs on the rear track, never across the fighting plane.
  const x = (time * 73 + 300) % 2600 - 950, y = 458;
  c.save(); c.translate(x, y); c.globalAlpha = .8;
  for (let i = 0; i < 4; i++) {
    const left = i * 245;
    c.fillStyle = i ? '#626861' : '#474d48'; c.fillRect(left, -93, 233, 78); c.strokeRect(left, -93, 233, 78);
    c.fillStyle = '#989b86';
    for (let n = 0; n < 5; n++) { c.fillRect(left + 17 + n * 40, -78, 26, 34); c.strokeRect(left + 17 + n * 40, -78, 26, 34); }
    c.fillStyle = '#343b36'; c.fillRect(left - 3, -103, 238, 10);
    for (const wx of [left + 32, left + 199]) {
      c.save(); c.translate(wx, -7); c.rotate(time * 3.5);
      c.fillStyle = '#424840'; c.beginPath(); c.arc(0, 0, 14, 0, 7); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(-11, 0); c.lineTo(11, 0); c.stroke(); c.restore();
    }
  }
  c.fillStyle = '#3c433d'; c.fillRect(945, -135, 26, 42);
  for (let i = 0; i < 8; i++) {
    const age = (time * .24 + i / 8) % 1;
    c.globalAlpha = (1 - age) * .23; c.fillStyle = '#d5d4bf';
    c.beginPath(); c.ellipse(957 - age * 165, -140 - age * 100, 9 + age * 35, 6 + age * 22, -.3, 0, 7); c.fill();
  }
  c.restore();
  c.strokeStyle = '#514c3e'; c.lineCap = 'round';
  c.save(); c.translate(1042, 137); c.rotate(time * .025);
  c.lineWidth = 4; c.beginPath(); c.moveTo(0, 0); c.lineTo(-5, -37); c.stroke();
  c.rotate(time * .22 + 1.8); c.lineWidth = 2; c.beginPath(); c.moveTo(0, 9); c.lineTo(0, -57); c.stroke(); c.restore();
  c.globalAlpha = .1; c.fillStyle = '#eee7d6';
  for (let i = 0; i < 6; i++) {
    const px = (i * 260 + time * 12) % 1600 - 200;
    c.beginPath(); c.ellipse(px, 473 + i % 2 * 9, 145, 13, 0, 0, 7); c.fill();
  }
  c.restore();
}

function drawHarborLife(c, time) {
  c.save(); c.lineCap = 'round'; c.lineWidth = 1.4;
  // Keep all ambient action behind the fighting plane, with held cartoon exposures.
  c.strokeStyle = '#e8debd';
  for (let i = 0; i < 23; i++) {
    const x = 320 + i * 27 + Math.sin(time * .7 + i) * 12;
    const y = 334 + i % 9 * 14;
    c.globalAlpha = .1 + (.5 + Math.sin(i * 3 + time)) * .07;
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 13, y + Math.sin(time + i) * 2, x + 27, y); c.stroke();
  }
  c.globalAlpha = .8;
  for (let i = 0; i < 3; i++) {
    const x = ((time * (8 + i * 2) + i * 310) % 1500) - 150;
    const y = 176 + i * 36 + Math.sin(time * .35 + i) * 9;
    const wing = Math.sin(time * 3 + i) * 5;
    c.strokeStyle = '#49483e'; c.beginPath(); c.moveTo(x - 8, y + wing); c.quadraticCurveTo(x - 3, y - 4, x, y); c.quadraticCurveTo(x + 4, y - 4, x + 9, y + wing); c.stroke();
  }
  const boatX = 620 + Math.sin(time * .065) * 145, boatY = 367 + Math.sin(time * 1.1) * 2;
  c.translate(boatX, boatY); c.rotate(Math.sin(time * .8) * .012);
  c.strokeStyle = '#403e33'; c.lineWidth = 1.5;
  path(c, [[-43, -3], [48, -3], [33, 12], [-30, 12]], '#77715e');
  c.fillStyle = '#b9ad91'; c.fillRect(-21, -25, 40, 20); c.strokeRect(-21, -25, 40, 20);
  c.fillStyle = '#474639'; c.fillRect(-11, -42, 10, 17); c.fillRect(8, -20, 7, 8); c.fillRect(-16, -20, 7, 8);
  c.beginPath(); c.moveTo(-27, -26); c.lineTo(25, -26); c.stroke();
  c.strokeStyle = '#c7bda3'; c.globalAlpha = .35;
  for (let i = 0; i < 4; i++) {
    c.beginPath(); c.ellipse(-40 - i * 16 - (time * 5 % 16), 14 + i % 2 * 2, 10, 1.6, 0, 0, Math.PI * 2); c.stroke();
  }
  for (let i = 0; i < 5; i++) {
    const age = (time * .42 + i / 5) % 1;
    c.globalAlpha = (1 - age) * .18; c.fillStyle = '#ddd2b6';
    c.beginPath(); c.ellipse(-7 - age * 35, -42 - age * 48, 4 + age * 12, 3 + age * 9, 0, 0, Math.PI * 2); c.fill();
  }
  c.restore();
  c.save();
  const glow = c.createRadialGradient(91, 235, 0, 91, 235, 44);
  glow.addColorStop(0, 'rgba(255,220,143,.14)'); glow.addColorStop(1, 'rgba(255,220,143,0)');
  c.fillStyle = glow; c.fillRect(47, 191, 88, 88);
  c.restore();
}

export function drawScene(c, match, image, time, { showcase = false, reducedMotion = false } = {}) {
  c.clearRect(0, 0, 1200, 675);
  c.save();
  if (!showcase && !reducedMotion && match.shake > 0) c.translate(Math.sin(time * 191) * match.shake, Math.cos(time * 153) * match.shake * .45);
  drawBackdrop(c, image, reducedMotion ? 0 : time, match.stage);
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
    if (!showcase && match.mode === 'arcade' && match.arcadeStage === 5) {
      c.save(); c.fillStyle = index ? PAPER : INK; c.strokeStyle = INK; c.lineWidth = 2;
      c.fillRect(f.x - 28, FLOOR + f.y - 345, 56, 22); c.strokeRect(f.x - 28, FLOOR + f.y - 345, 56, 22);
      c.fillStyle = index ? INK : PAPER; c.font = 'bold 12px Georgia'; c.textAlign = 'center';
      c.fillText(index ? 'RIVAL' : 'P1', f.x, FLOOR + f.y - 330); c.restore();
    }
    if (!showcase && f.combo >= 2 && f.comboTime > 0) {
      c.save(); c.font = 'italic bold 25px Georgia'; c.textAlign = index ? 'right' : 'left';
      c.strokeStyle = PAPER; c.lineWidth = 5; c.fillStyle = INK;
      const text = `${f.combo} HITS · ${Number(f.comboDamage.toFixed(1))} DAMAGE`, x = index ? 1120 : 80;
      c.strokeText(text, x, 157); c.fillText(text, x, 157); c.restore();
    }
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
      if (e.heavy) {
        c.strokeStyle = INK; c.lineWidth = 4;
        for (let i = 0; i < 7; i++) {
          const angle = i / 7 * Math.PI * 2, spread = 59 + (e.max - e.life) * 95;
          c.beginPath(); c.moveTo(Math.cos(angle) * spread, Math.sin(angle) * spread * .65);
          c.lineTo(Math.cos(angle) * (spread + 16), Math.sin(angle) * (spread + 16) * .65); c.stroke();
        }
      }
    }
    c.fillStyle = INK; c.textAlign = 'center'; c.font = 'italic bold 22px Georgia'; c.fillText(e.text, 0, 7); c.restore();
  }
  c.restore();
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
