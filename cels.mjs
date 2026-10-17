import { ROSTER, moveFor } from './engine.mjs';

export const CEL_STATES = {
  idle: [0, 1, 2, 3, 4, 5], walk: [6, 7, 8, 9, 10, 11],
  jump: [12, 13, 14], guard: [15, 16, 17], punch: [18, 19, 20],
  kick: [21, 22, 23], special: [24, 25, 26, 27], hurt: [28, 29],
  knockout: [30, 31, 32], victory: [33, 34, 35],
  dash: [36, 37, 38], throw: [39, 40, 41], airpunch: [42, 43, 44], airkick: [45, 46, 47]
};
const HEIGHT = { mickey: 220, minnie: 240, oswald: 270, felix: 224, betty: 228, popeye: 230 };
const IDLE_RATE = { mickey: 9, minnie: 11, oswald: 10, felix: 8, betty: 10, popeye: 8 };
const atlases = new Map();

export function celFor(f, { time = 0, animation, progress = 0, defeatTime, victoryTime, reducedMotion = false } = {}) {
  if (animation) {
    const fallback = { dash: 'walk', throw: 'punch', airpunch: 'punch', airkick: 'kick' };
    const frames = CEL_STATES[!['mickey', 'popeye'].includes(f.id) && fallback[animation] ? fallback[animation] : animation];
    if (!frames) throw new Error('Unknown animation: ' + animation);
    return frames[Math.min(frames.length - 1, Math.max(0, Math.floor(progress * frames.length)))];
  }
  if (defeatTime !== undefined) return defeatTime < .22 ? 30 : defeatTime < .48 ? 31 : 32;
  if (victoryTime !== undefined) return victoryTime < .24 ? 33 : victoryTime < .6 ? 34 : 35;
  if (f.hurt > 0) return f.reaction === 'block' ? 17 : f.hurt > .12 ? 28 : 29;
  if (f.attack) {
    const { kind, time: elapsed } = f.attack, move = moveFor(f, kind);
    if (kind === 'special') return elapsed < move.active * .55 ? 24 : elapsed < move.active ? 25 : elapsed <= move.until ? 26 : 27;
    const featured = f.id === 'mickey' || f.id === 'popeye';
    const state = featured && f.attack.air && ['punch', 'kick'].includes(kind) ? 'air' + kind : kind;
    const frames = CEL_STATES[!featured && state === 'throw' ? 'punch' : state];
    return elapsed < move.active ? frames[0] : elapsed <= move.until ? frames[1] : frames[2];
  }
  if (f.y < 0) return f.vy < -430 ? 12 : f.vy < 100 ? 13 : 14;
  if (f.dash > 0 && ['mickey', 'popeye'].includes(f.id)) return 36 + Math.min(2, Math.floor((.16 - f.dash) * 19));
  if (f.land > 0) return 2;
  if (f.guard) return 16;
  if (Math.abs(f.vx || 0) > 0) {
    const step = Math.floor((f.walk || 0) * 1.7) % 6;
    return 6 + (f.vx * f.face < 0 ? 5 - step : step);
  }
  if (reducedMotion) return 0;
  const held = Math.floor(time * IDLE_RATE[f.id]);
  const idle = held % 6;
  return idle === 2 && Math.floor(held / 6) % 5 !== 4 ? 1 : idle;
}

export function measureAtlas(pixels, width, height) {
  const rows = height / (width / 6);
  if (width < 6 || height < 6 || !Number.isInteger(rows) || pixels.length !== width * height * 4) throw new Error('Invalid cel atlas dimensions');
  return Array.from({ length: rows * 6 }, (_, index) => {
    const left = Math.floor(index % 6 * width / 6), right = Math.floor((index % 6 + 1) * width / 6);
    const top = Math.floor(Math.floor(index / 6) * height / rows), bottom = Math.floor((Math.floor(index / 6) + 1) * height / rows);
    let minX = right, minY = bottom, maxX = left, maxY = top;
    for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
      if (pixels[(y * width + x) * 4 + 3] > 32) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
    }
    if (minX > maxX) throw new Error(`Cel ${index + 1} is empty`);
    return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1, pivotX: (minX + maxX) / 2, baseline: maxY + 1 };
  });
}

export async function loadCels() {
  await Promise.all(ROSTER.map(async ({ id }) => {
    const image = new Image();
    image.src = new URL(`./assets/cels/${id}.svg`, import.meta.url).href;
    await image.decode();
    const surface = document.createElement('canvas');
    surface.width = image.naturalWidth; surface.height = image.naturalHeight;
    const context = surface.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, surface.width, surface.height).data;
    const frames = measureAtlas(pixels, surface.width, surface.height);
    const ground = frames.slice(0, 6).map(frame => frame.baseline).sort((a, b) => a - b)[3];
    // Use the authored registration peg, not each silhouette's center, so punches keep their feet planted.
    frames.forEach((frame, index) => {
      if (index >= 30 && index <= 32) return;
      frame.pivotX = (index % 6 + 245 / 512) * surface.width / 6;
      frame.baseline = Math.floor(index / 6) * surface.width / 6 + ground;
    });
    const referenceHeight = frames.slice(0, 6).map(f => f.height).sort((a, b) => a - b)[3];
    atlases.set(id, { image, frames, scale: HEIGHT[id] / referenceHeight });
    surface.width = 0;
  }));
}

export function drawCel(context, f, { x, y, scale = 1, ...animation } = {}) {
  const atlas = atlases.get(f.id);
  if (!atlas) return;
  const index = celFor(f, animation), frame = atlas.frames[index];
  const factor = atlas.scale * scale;
  const pivot = index >= 30 && index <= 32 ? frame.x + frame.width / 2 : frame.pivotX;
  context.save(); context.translate(x, y); context.scale(f.attack?.face || f.face || 1, 1);
  context.drawImage(atlas.image, frame.x, frame.y, frame.width, frame.height,
    (frame.x - pivot) * factor, (frame.y - frame.baseline) * factor, frame.width * factor, frame.height * factor);
  context.restore();
}
