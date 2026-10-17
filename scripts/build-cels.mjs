import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { ROSTER } from '../engine.mjs';

// These are discrete exposure drawings. There is no joint interpolation in the game renderer.
const INK = '#24221d', PAPER = '#faefd9', SHADE = '#c6bda6';
const PROFILES = {
  mickey: { bounce: [0, 6, 13, 8, -4, -2], sway: [-2, 0, 2, 4, 1, -1], stride: 58, lift: 45, lean: 6 },
  minnie: { bounce: [0, 4, 10, 3, -7, -3], sway: [-5, 0, 5, 3, -2, -5], stride: 57, lift: 58, lean: 9 },
  oswald: { bounce: [0, 8, 15, 5, -7, -3], sway: [-2, 2, 4, 2, -3, -4], stride: 70, lift: 53, lean: 7 },
  felix: { bounce: [7, 10, 13, 7, 2, 0], sway: [-5, -2, 3, 6, 2, -3], stride: 61, lift: 29, lean: 13 },
  betty: { bounce: [0, 3, 7, 4, -3, -2], sway: [-7, -3, 3, 7, 3, -3], stride: 46, lift: 35, lean: 5 },
  popeye: { bounce: [0, 4, 9, 6, -2, -1], sway: [-4, 0, 5, 7, 3, -1], stride: 66, lift: 27, lean: 11 }
};
const path = (d, fill = PAPER, width = 5, extra = '') => `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round" ${extra}/>`;
const line = (d, width = 4, color = INK) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"/>`;
const ellipse = (x, y, rx, ry, fill = PAPER, angle = 0, width = 5) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${INK}" stroke-width="${width}" transform="rotate(${angle} ${x} ${y})"/>`;
const group = (transform, contents) => `<g transform="${transform}">${contents}</g>`;

export function exposure(id, index) {
  if (index >= 36) {
    const action = Math.floor((index - 36) / 3), n = (index - 36) % 3;
    const pose = exposure(id, (action === 0 ? 6 : action === 1 || action === 2 ? 18 : 21) + n);
    pose.frame = index;
    if (action === 0) {
      pose.lean = [20, 28, 15][n]; pose.body[1] += 20;
      pose.front = [55, -145]; pose.back = [-100, -170]; pose.head = -8;
      pose.feet = [[-84, 0], [74, -28]]; pose.ear = -30; pose.tail = -25;
    } else if (action === 1) {
      pose.front = [[72, -220], [155, -245], [119, -125]][n];
      pose.back = [[-20, -210], [102, -197], [68, -136]][n];
      pose.lean = [-8, 19, 27][n]; pose.hand = 1.15;
      pose.mouth = n === 1 ? 'teeth' : 'focus'; pose.smear = n === 1;
    } else {
      pose.feet[0] = [-55, -33]; pose.knees[0] = [-63, -89];
      if (action === 2) { pose.feet[1] = [35, -47]; pose.knees[1] = [52, -99]; }
      pose.lean += 10; pose.ear = -28;
    }
    return pose;
  }
  const profile = PROFILES[id];
  const pose = { body: [0, 0], lean: 0, head: 0, front: [60, -178], back: [-52, -183], feet: [[-38, 0], [39, 0]], knees: [[-34, -48], [35, -48]], eyes: 'open', mouth: 'grin', ear: 0, tail: 0, skirt: 0, hand: 1, rotate: 0, shift: 0, smear: false, accent: '', frame: index };
  if (id === 'betty') { pose.front = [38, -189]; pose.back = [-38, -156]; pose.feet = [[-22, 0], [28, 0]]; }
  if (id === 'popeye') { pose.front = [73, -165]; pose.back = [-62, -190]; }
  if (id === 'felix') { pose.front = [66, -165]; pose.back = [-54, -159]; }
  if (index < 6) {
    pose.body = [profile.sway[index], profile.bounce[index]];
    pose.head = [0, -2, -3, 1, 3, 1][index];
    pose.front[1] += profile.bounce[(index + 4) % 6] * .7;
    pose.back[1] += profile.bounce[(index + 2) % 6] * .7;
    pose.ear = [0, -6, -12, 7, 12, 4][index];
    pose.tail = [0, 12, 23, 18, -9, -13][index];
    pose.eyes = index === 2 ? 'blink' : 'open';
    if (id === 'minnie' || id === 'betty') pose.skirt = profile.sway[(index + 2) % 6];
    if (id === 'popeye') pose.accent = index === 4 ? 'smoke' : '';
  } else if (index < 12) {
    const n = index - 6, step = [1, .62, -.18, -1, -.62, .18][n];
    const lifted = [0, .3, 1, 0, .3, 1][n] * profile.lift;
    pose.feet = [[-step * profile.stride, n < 3 ? -lifted : 0], [step * profile.stride, n >= 3 ? -lifted : 0]];
    pose.knees = [[-step * 35 - 15, -50 - (n < 3 ? lifted : 0)], [step * 35 + 15, -50 - (n >= 3 ? lifted : 0)]];
    pose.body = [profile.sway[n], [0, 11, -9, 0, 11, -9][n]];
    pose.lean = profile.lean;
    pose.front = [55 + step * 30, -171 + step * 14];
    pose.back = [-45 - step * 29, -173 - step * 18];
    pose.head = -step * 4; pose.ear = -step * 16; pose.tail = step * 21; pose.skirt = -step * 15;
    if (id === 'betty') { pose.feet[0][0] *= .6; pose.feet[1][0] *= .6; pose.front = [40, -180]; pose.back = [-37, -162]; }
    if (id === 'minnie') pose.feet[n < 3 ? 0 : 1][0] += n % 3 === 2 ? 35 : 0;
    if (id === 'popeye') { pose.front[0] += 15; pose.back[0] -= 12; pose.head = step * 6; }
  } else if (index < 15) {
    const n = index - 12;
    pose.body = [[0, 27], [5, -8], [-3, 7]][n];
    pose.front = [[75, -198], [77, -249], [78, -215]][n];
    pose.back = [[-62, -189], [-64, -243], [-70, -205]][n];
    pose.feet = [[[-48, 0], [48, 0]], [[-59, -45], [64, -38]], [[-37, -3], [43, -11]]][n];
    pose.knees = [[[-52, -29], [51, -29]], [[-74, -99], [76, -101]], [[-39, -49], [45, -57]]][n];
    pose.eyes = n === 1 ? 'wide' : 'open'; pose.mouth = n === 1 ? 'o' : 'grin'; pose.ear = [-20, 22, -15][n];
  } else if (index < 18) {
    const n = index - 15;
    pose.body = [n === 2 ? -14 : -5, n === 0 ? 9 : 23]; pose.lean = -9;
    pose.front = [[52, -216], [52, -242], [32, -246]][n];
    pose.back = [[-17, -211], [-9, -232], [-29, -229]][n];
    pose.eyes = n === 2 ? 'blink' : 'focus'; pose.mouth = 'tight'; pose.ear = -16;
    pose.feet = [[-50, 0], [47, 0]];
    if (n === 2) pose.accent = 'block';
  } else if (index < 21) {
    const n = index - 18;
    pose.body = [[-14, 8], [17, -2], [3, 5]][n]; pose.lean = [-13, 14, 3][n];
    pose.front = [[-17, -166], [181, -195], [79, -171]][n];
    pose.back = [[-53, -204], [-34, -205], [-48, -184]][n];
    pose.feet = [[-51, 0], [49, 0]]; pose.head = [8, -6, -2][n];
    pose.eyes = 'focus'; pose.mouth = n === 1 ? 'teeth' : 'tight'; pose.hand = n === 1 ? 1.28 : 1;
    pose.smear = n === 1; pose.ear = [15, -28, -10][n]; pose.skirt = [5, -17, -5][n];
    if (id === 'popeye' && n === 1) { pose.front = [178, -178]; pose.hand = 1.5; }
    if (id === 'minnie' && n === 1) pose.front = [164, -218];
    if (id === 'betty' && n === 1) { pose.front = [158, -206]; pose.head = -11; }
  } else if (index < 24) {
    const n = index - 21;
    pose.body = [[-6, 16], [-17, -5], [0, 13]][n]; pose.lean = [-9, -20, -3][n];
    pose.front = [[43, -206], [54, -219], [57, -191]][n];
    pose.back = [[-52, -178], [-86, -173], [-55, -174]][n];
    pose.feet = [[[-41, 0], [14, -55]], [[-52, 0], [179, -134]], [[-38, 0], [45, -22]]][n];
    pose.knees = [[[-38, -51], [44, -108]], [[-48, -58], [79, -133]], [[-34, -48], [46, -65]]][n];
    pose.mouth = n === 1 ? 'teeth' : 'grin'; pose.eyes = 'focus'; pose.skirt = [12, 38, 18][n];
    pose.smear = n === 1; pose.ear = [14, 27, -15][n];
    if (id === 'betty' || id === 'minnie') pose.feet[1][1] -= n === 1 ? 22 : 0;
  } else if (index < 28) {
    const n = index - 24;
    pose.body = [[-5, 11], [-12, 18], [13, -4], [2, 5]][n]; pose.lean = [-7, -12, 13, 1][n];
    pose.mouth = n === 1 || n === 2 ? 'o' : 'grin'; pose.eyes = n === 1 ? 'blink' : 'focus';
    pose.feet = [[-48, 0], [48, 0]]; pose.ear = [16, 22, -26, -9][n]; pose.accent = n === 2 ? id : '';
    if (id === 'mickey') { pose.front = [[43, -203], [39, -211], [69, -165], [57, -180]][n]; pose.mouth = n === 1 || n === 2 ? 'puff' : 'grin'; }
    if (id === 'minnie') { pose.front = [[20, -216], [-4, -251], [85, -287], [57, -191]][n]; pose.skirt = [10, 30, 46, 21][n]; pose.feet[1] = [[30, -24], [42, -60], [147, -112], [40, -16]][n]; pose.knees[1] = [51, -116]; }
    if (id === 'oswald') { pose.front = [[-21, -169], [18, -191], [107, -346], [73, -220]][n]; pose.hand = n === 2 ? 1.3 : 1; pose.body[1] = [26, 30, -13, 3][n]; pose.ear = [30, 38, -38, -15][n]; }
    if (id === 'felix') { pose.front = [[-5, -134], [48, -176], [128, -189], [62, -175]][n]; pose.back = [[-65, -135], [-12, -160], [54, -177], [-47, -160]][n]; pose.tail = [32, 57, -29, -10][n]; }
    if (id === 'betty') { pose.front = [[21, -206], [32, -225], [81, -224], [43, -187]][n]; pose.back = [-35, -155]; pose.head = [-4, -7, -14, -3][n]; pose.mouth = n === 1 || n === 2 ? 'kiss' : 'grin'; }
    if (id === 'popeye') { pose.front = [[62, -195], [41, -263], [37, -279], [98, -234]][n]; pose.back = n === 3 ? [-96, -236] : [-65, -182]; pose.accent = n < 3 ? 'can' : 'power'; pose.eyes = n === 2 ? 'blink' : 'focus'; }
  } else if (index < 30) {
    const n = index - 28;
    pose.body = [n ? -6 : -18, n ? 15 : 1]; pose.lean = n ? -9 : -19; pose.head = n ? -12 : -25;
    pose.front = [n ? 60 : 87, n ? -180 : -229]; pose.back = [-83, -209];
    pose.eyes = n ? 'blink' : 'wide'; pose.mouth = 'o'; pose.ear = n ? 27 : -38;
    pose.accent = n ? '' : 'stars';
  } else if (index < 33) {
    const n = index - 30;
    pose.rotate = [-24, -55, -88][n]; pose.shift = [0, 80, 120][n]; pose.drop = [0, -40, -100][n];
    pose.body = [-8, 9]; pose.front = [88, -190]; pose.back = [-83, -177];
    pose.feet = [[-58, -3], [68, -5]]; pose.eyes = 'dizzy'; pose.mouth = 'o'; pose.ear = [28, 40, 48][n];
    pose.accent = n === 2 ? 'stars' : '';
  } else {
    const n = index - 33;
    pose.body = [0, [9, -7, 0][n]]; pose.head = [-8, 4, -3][n]; pose.mouth = 'laugh';
    pose.front = [[79, -243], [78, -316], [76, -281]][n]; pose.back = [-44, -150]; pose.ear = [9, -14, 4][n];
    if (id === 'minnie') { pose.front = [75, -232]; pose.back = [-71, -231]; pose.skirt = [20, 35, 15][n]; pose.feet[1] = [60, -25]; }
    if (id === 'oswald') { pose.front[1] -= 9; pose.back = [-78, -287]; pose.ear = [-15, 17, -8][n]; }
    if (id === 'felix') { pose.front = [80, -226]; pose.back = [-70, -155]; pose.tail = [-22, 36, 9][n]; }
    if (id === 'betty') { pose.front = [n === 1 ? 65 : 31, -224]; pose.back = [-57, -126]; pose.mouth = n === 1 ? 'kiss' : 'grin'; pose.skirt = [12, 24, 10][n]; }
    if (id === 'popeye') { pose.front = [97, -238]; pose.back = [-96, -239]; pose.accent = 'power'; }
  }
  const stretches = [
    1, .97, .92, .98, 1.05, 1.02,
    1, .94, 1.06, 1, .94, 1.06,
    .88, 1.11, .97, .98, .93, .90,
    .94, 1.05, .98, .92, 1.04, .96,
    .95, .90, 1.06, 1, 1.07, .94,
    1, 1, 1, .96, 1.05, 1
  ];
  const elasticity = { mickey: 1, minnie: .8, oswald: 1.15, felix: 1.25, betty: .7, popeye: .65 }[id];
  pose.stretch = 1 + (stretches[index] - 1) * elasticity;
  return pose;
}

function mitten(x, y, color, scale = 1, open = false) {
  const silhouette = open
    ? 'M-13 9 C-25 1-26-9-20-12 L-11-5 C-20-29-13-37-7-25 L0-11 C-6-38 2-44 7-26 L11-10 C12-35 21-36 22-19 L22-4 C35-20 43-13 31 3 L20 17 C10 25-6 24-13 9Z'
    : 'M-19 5 C-26-8-20-24-10-25 C-3-32 5-29 9-25 C20-28 30-16 27-7 C38 0 30 15 19 17 C9 28-10 25-19 5Z';
  return group(`translate(${x} ${y}) scale(${scale})`, path(silhouette, color, 4) + line('M-7-17 Q-1-7-2 1 M6-19 Q13-8 10 1 M-14 7 Q1 16 16 9', 2.3, color === INK ? SHADE : INK));
}
function arm(start, elbow, end, color, width, handScale = 1, open = false, muscular = false) {
  const d = `M${start} Q${elbow} ${end}`;
  let drawing = line(d, width + 8) + line(d, width, color);
  if (muscular) {
    const x = end[0] * .73 + elbow[0] * .27, y = end[1] * .73 + elbow[1] * .27;
    drawing += ellipse(x, y, 35, 25, PAPER, -20, 4);
    drawing += group(`translate(${x - 1} ${y})`, line('M0-11V11 M-10 0 Q0 19 11 0 M-6-5H6', 2.5) + ellipse(0, -14, 3, 3, PAPER, 0, 2));
  }
  return drawing + mitten(...end, color, handScale, open);
}
function leg(hip, knee, foot, color, width, female, popeye) {
  const d = `M${hip} Q${knee} ${foot}`;
  const shoe = female
    ? path('M-17-10 Q-27-4-17 5 L-11 8 L-8 18 L-3 18 L0 6 Q26 13 35 3 Q38-8 18-10Z', INK, 3)
    : path('M-24-12 C-37-4-32 10-21 13 C-3 18 30 15 39 6 C48-4 25-14 10-14Z', popeye ? INK : PAPER, 4) + line('M-22 9 Q8 18 34 6', 2.3, popeye ? SHADE : INK);
  const rotation = foot[1] < -60 ? -15 : 0;
  return line(d, width + 7) + line(d, width, color) + group(`translate(${foot}) rotate(${rotation})`, shoe);
}
function eyes(id, pose) {
  if (pose.eyes === 'blink') return line('M-16-2 Q-7 6 1-2 M13-4 Q23 4 32-6', 4);
  if (pose.eyes === 'dizzy') return line('M-15-14L-1 1 M-1-14L-15 1 M14-15L29-1 M29-16L14-1', 4);
  if (id === 'popeye') return line('M5-10 Q17-17 28-11 M8-6 Q19-2 28-7', 3.4) + ellipse(-7, -6, 3, 5, INK, 0, 2);
  const feminine = id === 'minnie' || id === 'betty', wide = pose.eyes === 'wide';
  let drawing = ellipse(-8, -9, 12, wide ? 22 : 19, PAPER, -5, 3) + ellipse(17, -12, 13, wide ? 23 : 20, PAPER, 4, 3);
  drawing += path('M-6-22 C4-23 5-3-3 4 C-12 8-14-4-9-9 L-2-13 L-10-17Z', INK, 1);
  drawing += path('M19-26 C29-26 31-5 23 1 C14 6 11-8 15-12 L23-16 L15-20Z', INK, 1);
  if (pose.eyes === 'focus') drawing += path('M-23-25L7-15L5-27Z', INK, 1) + path('M6-28L34-23L10-14Z', INK, 1);
  if (feminine) drawing += line('M-18-23L-27-30 M-11-29L-14-37 M23-32L27-40 M30-26L39-32', 2.5);
  return drawing;
}
function mouth(id, pose) {
  if (pose.mouth === 'o' || pose.mouth === 'puff') return ellipse(25, 28, pose.mouth === 'puff' ? 12 : 8, pose.mouth === 'puff' ? 8 : 12, INK, -9, 3) + ellipse(26, 34, 5, 3, SHADE, 0, 1);
  if (pose.mouth === 'kiss') return path('M11 25 Q21 16 25 22 Q33 17 35 26 Q27 34 17 32Z', INK, 2) + line('M18 26H31', 1.5, PAPER);
  if (pose.mouth === 'tight') return line('M2 25 Q18 20 35 25 M6 30Q18 26 30 29', 2.4);
  if (pose.mouth === 'teeth') return path('M-1 18 Q18 26 37 13 Q36 41 15 40 Q2 36-1 18Z', PAPER, 3) + line('M3 29Q19 35 33 24 M13 24L15 38 M25 22L27 34', 1.8);
  if (pose.mouth === 'laugh') return path('M-5 19 Q14 30 38 11 Q37 47 12 44 Q-1 38-5 19Z', INK, 3) + path('M7 38Q19 26 29 38 Q22 45 12 43Z', SHADE, 1);
  return line('M-4 20 Q12 42 37 18 M-9 14Q-1 12 1 19 M32 13Q39 11 42 17', 3);
}

function head(id, pose) {
  const mouse = id === 'mickey' || id === 'minnie';
  let drawing = '';
  if (mouse || id === 'oswald' || id === 'felix') {
    if (mouse) drawing += path('M-33-23 C-83-14-94-61-68-78 C-39-97-15-68-26-40Z', INK) + path('M18-42 C9-74 42-97 65-74 C90-48 70-19 42-22Z', INK);
    if (id === 'oswald') drawing += group(`rotate(${pose.ear * .45} -29 -41)`, path('M-34-25 C-57-51-62-105-44-121 C-23-139-11-103-15-72 L-19-28Z', INK)) + group(`rotate(${-pose.ear * .4} 23 -40)`, path('M12-30 C1-61 7-120 30-125 C56-128 47-71 32-29Z', INK));
    if (id === 'felix') drawing += path('M-45-18 L-51-77 Q-28-68-10-48 L20-49 Q33-76 50-81 L48-13Z', INK);
    drawing += path('M-47-5 C-59-42-31-62 1-60 C38-63 57-40 53-11 C64 22 37 46 3 43 C-25 45-50 22-47-5Z', INK);
    drawing += path('M-37-7 C-38-38-15-48-5-28 C7-56 35-47 38-16 L40 11 C17 28-26 29-38 11Z', PAPER, 3.5);
    if (pose.mouth === 'puff') drawing += ellipse(-13, 18, 25, 19, PAPER, -12, 3);
    drawing += path('M-23 7 C-7 1 12 9 32 1 C50-6 66 3 61 14 C58 29 22 38-2 31 C-18 28-30 18-23 7Z', PAPER, 3.5);
    drawing += group('translate(3 -6)', eyes(id, pose));
    drawing += ellipse(54, 0, 17, 10, INK, -8, 3);
    drawing += group('translate(3 0)', mouth(id, pose));
    if (id === 'felix') drawing += line('M-35 7L-68-3 M-35 17L-74 20 M47 13L77 4 M43 23L78 30', 2.6);
    if (id === 'mickey') drawing += group(`rotate(${-pose.head * .4} 0 -60)`, path('M-31-60 Q-2-72 34-62 L43-57 Q4-47-38-55Z', INK, 3) + path('M-20-65 L-24-88 Q-8-103 20-93 L27-69 Q3-61-20-65Z', PAPER, 4) + line('M-19-84 Q4-94 22-83', 3));
    if (id === 'minnie') {
      drawing += path('M-30-62 Q0-76 34-64 L37-59 Q2-50-31-56Z', PAPER, 3) + path('M-18-65L-20-85Q-3-95 15-85L21-67Z', PAPER, 3);
      drawing += line('M9-88Q9-116 29-123', 2.4);
      for (let i = 0; i < 5; i++) drawing += ellipse(31 + Math.cos(i * 1.257) * 10, -126 + Math.sin(i * 1.257) * 10, 7, 8, PAPER, i * 72, 2);
      drawing += ellipse(31, -126, 5, 5, INK, 0, 2);
    }
  } else if (id === 'betty') {
    drawing += path('M-52-2 C-70-55-36-78 0-74 C37-78 67-48 53-1 L42 30 L-42 30Z', INK);
    drawing += path('M-46-24 C-72-35-76 7-60 32 C-54 43-42 39-38 26Z', INK) + path('M43-24 C63-40 76-6 63 24 C57 42 45 43 40 22Z', INK);
    drawing += path('M-40-24 C-32-57 27-58 42-26 L44 5 C47 36 20 56-2 51 C-33 48-51 17-40-24Z', PAPER, 4);
    drawing += path('M-47-26 Q-44-60-18-63 Q-7-73 5-62 Q30-66 46-33 L35-19 Q23-38 15-25 Q5-42-4-27 Q-15-42-25-25 Q-34-36-40-19Z', INK, 3);
    drawing += group('translate(0 -2)', eyes(id, pose));
    drawing += path('M3 10Q15 3 19 12Q13 18 6 16', PAPER, 2.5);
    drawing += group('translate(-2 7) scale(.82)', mouth(id, pose));
    drawing += ellipse(-51, 32, 7, 9, PAPER, 8, 2.8) + ellipse(54, 31, 7, 9, PAPER, -8, 2.8);
    drawing += line('M-30 13Q-24 17-18 13 M27 16Q34 19 39 14', 2, SHADE);
  } else {
    drawing += path('M-30-54 C-42-34-41-4-29 13 L-22 30 Q-25 52 0 55 L31 51 Q55 44 48 28 Q42 17 24 20 L28-34Q16-60-30-54Z', PAPER, 5);
    drawing += ellipse(-32, 0, 10, 16, PAPER, 0, 3) + line('M-36-3Q-23-11-28 9', 2.3);
    drawing += path('M19-8 C38-18 62-10 60 0 Q59 12 34 11L22 7', PAPER, 3.5);
    drawing += group('translate(1 -11)', eyes(id, pose));
    drawing += line('M-10 27 Q5 22 15 29 Q28 32 35 23 M0 38Q16 45 33 36', 3);
    drawing += path('M25 25Q39 19 39 27Q38 34 29 33Z', INK, 1.5);
    drawing += line('M-16 14Q-6 6 2 15 M-17 19Q-7 13-1 20 M-19-30L-11-39', 2.4);
    drawing += path('M-38-49 Q1-61 40-53 L38-44 Q-4-35-39-42Z', INK, 3);
    drawing += path('M-32-56 C-54-74-20-93 5-86 C36-91 54-73 36-59 Q2-48-32-56Z', PAPER, 4);
    drawing += line('M-24-72Q2-86 28-73 M-8-82L-12-70', 2.8);
    if (pose.mouth !== 'o') drawing += line('M29 32Q55 40 77 21', 6) + path('M65 6Q78-1 91 6L86 31Q77 37 71 28Z', SHADE, 3) + ellipse(79, 6, 13, 5, INK, 0, 2);
    if (pose.eyes === 'blink') drawing += line('M-7-17Q4-12 12-19', 3);
  }
  return drawing;
}

function torso(id, pose) {
  const s = pose.skirt;
  if (id === 'popeye') return path('M-34-208 Q-5-226 35-207 L52-176 Q31-142 37-103 L-37-103 Q-25-151-47-181Z', INK) + path('M-21-210L-1-170L23-210L10-211L-2-191L-12-213Z', PAPER, 3) + path('M-37-112Q0-100 38-112L31-75L3-73L0-88L-4-73L-34-77Z', '#625f51', 4) + line('M-34-104Q0-94 35-103', 3, PAPER) + ellipse(5, -154, 3, 3, PAPER, 0, 1) + ellipse(5, -140, 3, 3, PAPER, 0, 1);
  if (id === 'betty') return path(`M-24-211 Q-4-197 21-211 L27-176 Q17-156 24-136 L${45 + s * .3}-84 Q0-65 ${-39 - s * .4}-86 L-23-142 Q-15-165-29-178Z`, INK, 4) + line(`M${-35 - s * .3}-87Q0-72 ${40 + s * .2}-87`, 3, PAPER) + line('M-25-199Q-2-184 24-198', 3, PAPER);
  let drawing = path('M-21-207 C-42-181-43-143-26-118 Q-2-100 27-118 C44-141 39-184 21-207Z', INK, 4);
  if (id === 'minnie') {
    drawing += path(`M-32-139Q0-126 31-139 C${39 + s}-115 ${51 + s}-105 ${63 + s}-86 Q9-64 ${-51 - s * .45}-86 Q-39-104-32-139Z`, INK, 4);
    drawing += line(`M${-44 - s * .3}-87Q5-69 ${55 + s * .6}-87`, 3, PAPER);
    for (const [x, y] of [[-22, -115], [4, -101], [27, -119], [39, -91], [-29, -87]]) drawing += ellipse(x + s * .15, y, 5, 5, PAPER, 0, 1);
  } else if (id === 'mickey' || id === 'oswald') {
    drawing += path('M-36-139Q0-129 35-139L40-91L9-85L0-101L-8-86L-38-91Z', PAPER, 4);
    drawing += ellipse(-17, -116, 6, 10, INK, -5, 2) + ellipse(19, -117, 6, 10, INK, 5, 2);
    drawing += line('M-28-134Q-9-130 0-131', 2, SHADE);
  } else drawing += path('M-23-135 Q-46-104-28-85 Q-2-70 27-89 Q44-105 23-135Z', INK, 3);
  return drawing;
}

function accents(id, pose) {
  let drawing = '';
  if (pose.smear && pose.frame === 19) drawing += line('M45-187Q100-250 174-209 M58-176Q109-218 159-198 M66-163Q112-196 146-188', 4) + path('M69-184 Q126-225 157-204 Q106-202 69-184Z', SHADE, 0);
  if (pose.smear && pose.frame === 22) drawing += line('M34-42Q150-37 184-111 M64-26Q177-39 200-114', 3.5);
  if (pose.accent === 'mickey') drawing += line('M89-244 C133-263 126-228 155-238 C176-249 181-217 204-236', 7, PAPER) + line('M104-254Q133-280 153-257 M148-214Q179-195 204-220', 2.3);
  if (pose.accent === 'minnie') drawing += line('M-73-129Q-16-55 92-87Q149-110 152-162 M-73-119Q-18-43 90-72', 4);
  if (pose.accent === 'oswald') drawing += line('M49-152Q127-195 138-306 M65-142Q148-186 157-296', 4);
  if (pose.accent === 'felix') {
    drawing += path('M155-188Q145-204 159-209Q169-227 180-211Q199-208 189-194Q198-176 181-177Q162-166 155-188Z', INK, 3);
    drawing += ellipse(205, -207, 4, 6, INK, 20, 1) + ellipse(204, -176, 3, 4, INK, -20, 1);
  }
  if (pose.accent === 'betty') drawing += group('translate(140 -249)', line('M0 0V-35L25-41V-10 M0-27L25-33', 4) + ellipse(-7, 0, 9, 6, INK, -20, 2) + ellipse(18, -10, 9, 6, INK, -20, 2)) + line('M173-286Q201-263 181-240', 3);
  if (pose.accent === 'can') drawing += group(`translate(${pose.front[0] + 5} ${pose.front[1] - 17}) rotate(-12)`, path('M-15-22H15V18Q0 27-15 18Z', PAPER, 3) + ellipse(0, -22, 15, 5, SHADE, 0, 2) + path('M-7 10Q-17-8-2-9Q11-19 8-2Q3 8-7 10Z', '#888a70', 2) + line('M-7 12L5-8', 1.5));
  if (pose.accent === 'power') for (const side of [-1, 1]) drawing += group(`scale(${side} 1)`, line('M102-255L118-271 M111-234L133-237 M105-216L126-207', 3.5));
  if (pose.accent === 'block') drawing += line('M69-258L89-272 M79-238L103-240 M77-219L97-207', 4);
  if (pose.accent === 'smoke') drawing += line('M100-255C123-265 90-285 117-298', 3, SHADE);
  if (pose.accent === 'stars') for (const [x, y] of [[-49, -318], [14, -350], [61, -309]]) drawing += path(`M${x} ${y - 9}L${x + 3} ${y - 3}L${x + 11} ${y - 2}L${x + 4} ${y + 3}L${x + 5} ${y + 10}L${x - 1} ${y + 5}L${x - 8} ${y + 8}L${x - 6} ${y}L${x - 11} ${y - 5}L${x - 3} ${y - 4}Z`, PAPER, 2);
  return drawing;
}

function cel(id, pose) {
  const female = id === 'minnie' || id === 'betty', popeye = id === 'popeye';
  const skin = id === 'betty' || popeye ? PAPER : INK;
  const bodyY = pose.body[1], bodyX = pose.body[0];
  let back = '';
  if (id === 'felix') back += line(`M-26-106C-109 ${-86 + pose.tail * .3} -83 ${-10 - pose.tail * .3} -119 ${-35 - pose.tail * .4}`, 21);
  if (id === 'oswald') back += ellipse(-37, -114, 17, 16, INK, -15, 3);
  if (id === 'mickey' || id === 'minnie') back += line(`M-28-108Q-90 ${-51 + pose.tail} -104 ${-104 + pose.tail}`, 3);
  back += leg([-17 + bodyX, -94 + bodyY], pose.knees[0], pose.feet[0], skin, female ? 13 : popeye ? 20 : 17, female, popeye);
  back += leg([17 + bodyX, -94 + bodyY], pose.knees[1], pose.feet[1], skin, female ? 13 : popeye ? 20 : 17, female, popeye);
  const rearElbow = [pose.back[0] - 18, pose.back[1] + 48];
  let body = arm([-27, -191], rearElbow, pose.back, skin, popeye ? 20 : 14, popeye ? 1.1 : .8, pose.frame >= 28 && !popeye, popeye);
  body += torso(id, pose);
  const neckY = id === 'betty' ? -237 : popeye ? -260 : -243;
  body += group(`translate(0 ${neckY}) rotate(${pose.head})`, head(id, pose));
  const frontElbow = [pose.front[0] * .46 - 12, pose.front[1] + 49];
  body += arm([popeye ? 34 : 23, -192], frontElbow, pose.front, skin, popeye ? 20 : 14, (popeye ? 1.1 : .83) * pose.hand, ((pose.frame >= 28 && pose.frame < 36) || (pose.frame >= 39 && pose.frame < 42)) && !popeye, popeye);
  if (id === 'betty') body += line('M24-48Q32-54 40-47', 4) + ellipse(37, -50, 5, 5, INK, 0, 1);
  body = group(`translate(${bodyX} ${bodyY}) rotate(${pose.lean} 0 -115) translate(0 -135) scale(${1 / Math.sqrt(pose.stretch)} ${pose.stretch}) translate(0 135)`, body);
  return group(`translate(${pose.shift} ${pose.drop || 0}) rotate(${pose.rotate} 0 -35)`, back + body + accents(id, pose));
}

export function buildCel(id, index) {
  return `<g transform="translate(245 444)">${cel(id, exposure(id, index))}</g>`;
}

export function buildSheet(id) {
  if (!PROFILES[id]) throw new Error('Unknown character: ' + id);
  let drawings = '';
  const count = id === 'mickey' || id === 'popeye' ? 48 : 36;
  for (let index = 0; index < count; index++) {
    const x = index % 6 * 512, y = Math.floor(index / 6) * 512;
    drawings += `<g data-cel="${index}" transform="translate(${x} ${y})"><clipPath id="cell-${index}"><rect width="512" height="512"/></clipPath><g clip-path="url(#cell-${index})">${buildCel(id, index)}</g></g>\n`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="${count / 6 * 320}" viewBox="0 0 3072 ${count / 6 * 512}"><title>${id} — ${count} cel drawings</title>${drawings}</svg>\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await mkdir(new URL('../assets/cels/', import.meta.url), { recursive: true });
  for (const { id } of ROSTER) await writeFile(new URL(`../assets/cels/${id}.svg`, import.meta.url), buildSheet(id));
  console.log('Authored 240 vector cels, including dash, throw and aerial attacks for the featured fighters.');
}
