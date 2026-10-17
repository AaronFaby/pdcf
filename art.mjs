import { FLOOR, MOVES } from './engine.mjs';

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
function curve(c, points, color = INK, width = 5) {
  c.beginPath(); c.moveTo(points[0], points[1]);
  if (points.length === 8) c.bezierCurveTo(...points.slice(2));
  else c.quadraticCurveTo(...points.slice(2));
  c.strokeStyle = color; c.lineWidth = width; c.stroke(); c.lineWidth = 4; c.strokeStyle = INK;
}
function eye(c, x, y, rx = 6, ry = 14, lashes = false) {
  ellipse(c, x, y, rx + 3, ry + 2, PAPER);
  c.save(); c.lineWidth = 1;
  ellipse(c, x + 2, y + 2, rx * .55, ry * .8, INK);
  path(c, [[x + 2, y], [x + 8, y - 5], [x + 8, y + 1]], PAPER);
  c.restore();
  if (lashes) {
    curve(c, [x - 5, y - 10, x - 14, y - 19, x - 10, y - 20], INK, 2);
    curve(c, [x, y - 14, x - 3, y - 23, x, y - 25], INK, 2);
  }
}
function hand(c, x, y, color, size = 13) {
  ellipse(c, x, y, size, size * .86, color, -.2);
  curve(c, [x + 1, y - size * .6, x - 3, y, x + 3, y + size * .5], INK, 2);
}
function arm(c, start, elbow, end, color, width, fist = 13) {
  curve(c, [...start, ...elbow, ...end], INK, width + 7);
  curve(c, [...start, ...elbow, ...end], color, width);
  hand(c, ...end, color, fist);
}
function leg(c, hip, knee, foot, color, width, shoe = PAPER, heel = false) {
  curve(c, [...hip, ...knee, ...foot], INK, width + 6);
  curve(c, [...hip, ...knee, ...foot], color, width);
  ellipse(c, foot[0] + 7, foot[1] - 1, heel ? 17 : 24, heel ? 9 : 12, shoe, -.12);
  if (heel) path(c, [[foot[0] - 13, foot[1]], [foot[0] - 10, foot[1] + 8], [foot[0] - 7, foot[1]]], INK);
}

// shortcut: a shared procedural rig supplies the first-pass animation; use individual cels for production art.
export function drawFighter(c, f, { x = f.x, y = FLOOR + f.y, scale = 1, time = 0, portrait = false } = {}) {
  const id = f.id, female = id === 'betty' || id === 'minnie', popeye = id === 'popeye';
  const walk = Math.abs(f.vx || 0) > 0 ? Math.sin((f.walk || time) * 2.3) : 0;
  const hop = f.y < 0;
  const bounce = portrait ? Math.sin(time * 2) * 2 : Math.sin(time * 6) * 2.2;
  const attack = f.attack, phase = attack ? attack.time / MOVES[attack.kind].duration : 0;
  const strike = attack ? Math.sin(Math.min(1, phase * 2) * Math.PI) : 0;
  const punch = attack?.kind === 'punch' ? strike : 0;
  const kick = attack?.kind === 'kick' ? strike : 0;
  const special = attack?.kind === 'special' ? strike : 0;
  c.save(); c.translate(x, y + bounce); c.scale(scale * (f.face || 1), scale);
  c.lineJoin = 'round'; c.lineCap = 'round'; c.lineWidth = 4; c.strokeStyle = INK;
  if (f.hurt > .13) { c.translate(-6, -2); c.rotate(-.045); }
  if (f.buff > 0) {
    c.save(); c.strokeStyle = '#b88432'; c.lineWidth = 3;
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + time; c.beginPath(); c.moveTo(Math.cos(a) * 75, -100 + Math.sin(a) * 110); c.lineTo(Math.cos(a) * 88, -100 + Math.sin(a) * 126); c.stroke(); }
    c.restore();
  }
  if (id === 'felix') {
    curve(c, [-19, -66, -82, -57, -68, -13, -84, -37], INK, 15);
  } else if (id === 'oswald') ellipse(c, -27, -63, 14, 12, INK);
  else if (id === 'mickey' || id === 'minnie') curve(c, [-23, -55, -66, -36, -65, -65, -79, -54], INK, 3);
  const skin = popeye || id === 'betty' ? PAPER : INK;
  const shoe = popeye ? INK : PAPER;
  leg(c, [-11, -57], [-26 - walk * 15, -32], [-29 - walk * 18, -7 + (hop ? -8 : -Math.max(0, walk) * 8)], skin, female ? 10 : 15, shoe, female);
  leg(c, [13, -57], [24 + walk * 15 + kick * 35, -32 - kick * 28], [30 + walk * 18 + kick * 70, -7 - kick * 62 - (hop ? 10 : 0)], skin, female ? 10 : 15, shoe, female);
  arm(c, [-17, -115], [-44, -100], [-45 + (f.guard ? 20 : 0), -128 - (f.guard ? 25 : 0)], skin, popeye ? 15 : 11, popeye ? 19 : 12);
  if (popeye) {
    path(c, [[-25, -130], [16, -130], [31, -67], [-24, -65]], INK);
    path(c, [[-12, -133], [2, -111], [17, -133]], PAPER);
    path(c, [[-26, -72], [29, -72], [22, -48], [-20, -48]], '#55534a');
    curve(c, [-25, -69, 4, -66, 27, -70], PAPER, 3);
    for (let j = 0; j < 3; j++) ellipse(c, 5, -98 + j * 9, 2, 2, PAPER);
  } else if (id === 'betty') {
    path(c, [[-17, -132], [18, -132], [17, -104], [30, -58], [-30, -58], [-16, -104]], INK);
    curve(c, [-27, -61, 0, -50, 28, -61], PAPER, 3);
    curve(c, [14, -39, 21, -43, 27, -39], INK, 4);
    ellipse(c, 26, -41, 5, 4, INK);
  } else {
    ellipse(c, 0, -104, 28, 39, INK);
    if (id === 'minnie') {
      path(c, [[-24, -85], [22, -85], [42, -52], [-37, -52]], INK);
      for (const [px, py] of [[-17, -67], [4, -61], [20, -72], [25, -55]]) ellipse(c, px, py, 4, 4, PAPER);
    } else if (id !== 'felix') {
      path(c, [[-28, -87], [27, -87], [31, -56], [3, -54], [0, -65], [-3, -54], [-28, -57]], PAPER);
      ellipse(c, -12, -74, 4, 7, PAPER); ellipse(c, 15, -74, 4, 7, PAPER);
    }
  }
  c.save(); c.translate(punch * 8 + special * 4, f.guard ? 4 : 0);
  if (popeye) {
    ellipse(c, 5, -167, 25, 40, PAPER, -.08);
    ellipse(c, 18, -143, 28, 20, PAPER);
    ellipse(c, 35, -166, 13, 8, PAPER);
    curve(c, [13, -178, 21, -181, 28, -177], INK, 3);
    curve(c, [13, -174, 21, -171, 28, -174], INK, 2);
    curve(c, [-5, -151, 5, -154, 6, -149], INK, 3);
    ellipse(c, -17, -165, 7, 11, PAPER);
    curve(c, [17, -141, 30, -137, 37, -143], INK, 2);
    curve(c, [33, -141, 50, -141, 59, -151], INK, 5);
    path(c, [[53, -160], [68, -160], [65, -144], [57, -144]], '#a09a87');
    ellipse(c, 59, -161, 8, 4, INK);
    path(c, [[-22, -198], [32, -198], [28, -190], [-21, -188]], INK);
    ellipse(c, 3, -207, 32, 11, PAPER, -.13);
    curve(c, [-18, -212, -4, -224, 19, -217], INK, 3);
  } else if (id === 'betty') {
    ellipse(c, 0, -170, 39, 38, INK);
    ellipse(c, -33, -160, 13, 28, INK, .15);
    ellipse(c, 35, -161, 12, 27, INK, -.15);
    ellipse(c, 3, -162, 32, 33, PAPER);
    path(c, [[-31, -177], [-25, -193], [-6, -200], [18, -194], [30, -180], [14, -184], [6, -176], [-4, -183], [-13, -177], [-21, -184]], INK);
    eye(c, -8, -167, 6, 11, true); eye(c, 15, -166, 6, 11, true);
    ellipse(c, 5, -153, 4, 3, PAPER);
    ellipse(c, 8, -140, 7, 4, INK);
    ellipse(c, -34, -137, 5, 6, PAPER); ellipse(c, 35, -138, 5, 6, PAPER);
  } else {
    if (id === 'oswald') {
      ellipse(c, -22, -224, 12, 45, INK, -.22);
      ellipse(c, 19, -226, 12, 46, INK, .2);
    } else if (id === 'felix') {
      path(c, [[-34, -179], [-35, -214], [-9, -195]], INK);
      path(c, [[10, -195], [32, -215], [37, -177]], INK);
    } else {
      ellipse(c, -30, -192, 24, 25, INK);
      ellipse(c, 25, -195, 24, 25, INK);
    }
    ellipse(c, 0, -164, 37, 36, INK);
    ellipse(c, -10, -160, 19, 26, PAPER, -.18);
    ellipse(c, 13, -162, 20, 26, PAPER, .13);
    ellipse(c, 9, -144, 29, 15, PAPER);
    eye(c, -6, -168, 5, 11, id === 'minnie'); eye(c, 15, -170, 5, 11, id === 'minnie');
    ellipse(c, 33, -155, 11, 7, INK, -.15);
    curve(c, [-6, -145, 6, -131, 27, -143], INK, 3);
    if (id === 'felix') {
      for (const yy of [-153, -142]) {
        curve(c, [-21, yy, -37, yy - 5, -48, yy - 7], INK, 2);
        curve(c, [28, yy, 42, yy - 3, 49, yy - 5], INK, 2);
      }
    }
    if (id === 'minnie') {
      ellipse(c, 0, -205, 22, 6, PAPER, -.12);
      path(c, [[-13, -207], [-13, -219], [11, -222], [14, -208]], PAPER);
      curve(c, [4, -222, 8, -238, 20, -242], INK, 2);
      for (let i = 0; i < 5; i++) ellipse(c, 22 + Math.cos(i * 1.26) * 7, -242 + Math.sin(i * 1.26) * 7, 5, 5, PAPER);
      ellipse(c, 22, -242, 4, 4, INK);
    }
    if (id === 'mickey') {
      ellipse(c, 0, -202, 23, 6, INK, -.15);
      path(c, [[-13, -207], [-13, -222], [13, -224], [17, -210]], PAPER);
      curve(c, [-10, -220, 3, -225, 13, -221], INK, 2);
    }
  }
  c.restore();
  const end = f.guard ? [18, -162] : [35 + punch * 97 + special * 24, -106 - punch * 10 - special * 32];
  const elbow = f.guard ? [-3, -110] : [5 + punch * 45, -80 - punch * 26];
  if (popeye) {
    arm(c, [20, -119], elbow, end, PAPER, 15, 22);
    ellipse(c, (elbow[0] + end[0]) / 2, (elbow[1] + end[1]) / 2, 21, 17, PAPER, -.25);
    hand(c, ...end, PAPER, 21);
    const ax = (elbow[0] + end[0]) / 2, ay = (elbow[1] + end[1]) / 2;
    curve(c, [ax, ay - 8, ax, ay, ax, ay + 9], INK, 2);
    curve(c, [ax - 8, ay + 2, ax, ay + 16, ax + 8, ay + 2], INK, 2);
    ellipse(c, ax, ay - 9, 2, 2, PAPER);
  } else arm(c, [18, -117], elbow, end, skin, 11, female ? 12 : 14);
  if (attack?.kind === 'special' && popeye) {
    c.save(); c.translate(end[0], end[1]);
    path(c, [[-10, -14], [10, -14], [10, 12], [-10, 12]], '#9b9b76');
    ellipse(c, 0, -14, 10, 4, PAPER);
    c.font = 'bold 9px Georgia'; c.fillStyle = INK; c.textAlign = 'center'; c.fillText('S', 0, 5); c.restore();
  }
  c.restore();
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
  for (const f of fighters) {
    c.save(); c.fillStyle = 'rgba(28,26,20,.22)';
    c.beginPath(); c.ellipse(f.x, FLOOR + 6, Math.max(25, 61 + f.y * .1), 12, 0, 0, 7); c.fill(); c.restore();
    drawFighter(c, f, { time: reducedMotion ? 0 : time, scale: 1.15 });
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
