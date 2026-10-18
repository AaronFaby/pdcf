import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { STAGES, stageFor } from '../assets/runtime/stages.mjs';

export const RATE = 22050;
export const TEMPO = 144;
export const BEAT = 60 / TEMPO;
export const BARS = 32;
export const MUSIC_SECONDS = BARS * 4 * BEAT;
const tau = Math.PI * 2, hz = note => 440 * 2 ** ((note - 69) / 12);

export function wav(samples) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(RATE, 24); buffer.writeUInt32LE(RATE * 2, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  return buffer;
}

function noise(seed = 1930) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2147483648 - 1; };
}

function note(output, start, pitch, duration, instrument, volume, random) {
  const freq = hz(pitch), count = Math.ceil((duration + .18) * RATE), offset = Math.round(start * RATE);
  let smooth = 0;
  for (let i = 0; i < count; i++) {
    const t = i / RATE, p = tau * freq * t;
    const release = Math.exp(-Math.max(0, t - duration) * 35);
    const attack = Math.min(1, t / (instrument === 'reed' || instrument === 'brass' ? .025 : .004));
    let value;
    if (instrument === 'piano') value = (Math.sin(p + 1.5 * Math.exp(-t * 24) * Math.sin(p * 2.002)) + .36 * Math.sin(p * 2.003) * Math.exp(-t * 8) + .15 * Math.sin(p * 3.008) * Math.exp(-t * 12)) * Math.exp(-t * 5);
    else if (instrument === 'bass') value = (Math.sin(p) + .25 * Math.sin(2 * p) + .12 * Math.sin(3 * p)) * Math.exp(-t * 8);
    else if (instrument === 'banjo') value = (Math.sin(p + .8 * Math.sin(p * 3) * Math.exp(-t * 25)) + .4 * Math.sin(2 * p) + .2 * Math.sin(p * 4.01)) * Math.exp(-t * 19);
    else if (instrument === 'calliope') value = (Math.sin(p + .018 * Math.sin(tau * 6 * t)) + .22 * Math.sin(2 * p) + .12 * Math.sin(4 * p)) * (.9 + .1 * Math.sin(tau * 3 * t));
    else {
      const vibrato = .035 * Math.sin(tau * 5.2 * t) * Math.min(1, t * 8), phase = p + vibrato;
      value = instrument === 'reed'
        ? Math.sin(phase) + .28 * Math.sin(phase * 3) + .11 * Math.sin(phase * 5) + random() * .035
        : Math.sin(phase) + .42 * Math.sin(phase * 2) + .2 * Math.sin(phase * 3) + .08 * Math.sin(phase * 4);
      value *= .88 + .12 * Math.sin(t * 17);
    }
    smooth += .65 * (value - smooth);
    output[(offset + i) % output.length] += smooth * attack * release * volume;
  }
}

function drum(output, start, type, volume, random) {
  const length = type === 'brush' ? .15 : .09, offset = Math.round(start * RATE);
  let low = 0;
  for (let i = 0; i < length * RATE; i++) {
    const t = i / RATE, n = random(); low += .18 * (n - low);
    const value = type === 'kick' ? Math.sin(tau * (65 * t - 70 * t * t)) * Math.exp(-t * 45)
      : type === 'block' ? (Math.sin(tau * 830 * t) + .5 * Math.sin(tau * 1190 * t)) * Math.exp(-t * 65)
      : (n - low) * Math.exp(-t * 27);
    output[(offset + i) % output.length] += value * volume;
  }
}

export function composeHarbor() {
  const output = new Float32Array(Math.round(MUSIC_SECONDS * RATE)), random = noise();
  const chords = [[48, 52, 55, 57], [45, 49, 52, 55], [50, 53, 57, 60], [43, 47, 50, 53], [48, 52, 55, 57], [53, 57, 60, 63], [48, 52, 55, 57], [43, 47, 50, 53], [53, 57, 60, 64], [54, 57, 60, 63], [48, 52, 55, 57], [45, 49, 52, 55], [50, 53, 57, 60], [43, 47, 50, 53], [48, 52, 55, 57], [43, 47, 50, 53]];
  // Original harbor tune, swung eighths over stride piano and walking bass.
  const melody = [
    [76, 79, 81, 79, 76, 74, 72, 74], [73, 76, 79, 81, 79, 76, 73, 69],
    [74, 77, 81, 84, 81, 77, 76, 74], [71, 74, 77, 79, 77, 74, 71, 67],
    [72, 76, 79, 84, 83, 81, 79, 76], [75, 77, 81, 84, 81, 77, 75, 72],
    [76, 79, 81, 79, 76, 74, 72, 76], [74, 71, 67, 71, 74, 77, 79, 71],
    [81, 84, 88, 86, 84, 81, 79, 77], [81, 84, 87, 84, 81, 78, 75, 72],
    [79, 76, 72, 76, 79, 81, 84, 79], [85, 81, 79, 76, 73, 76, 79, 81],
    [81, 77, 74, 77, 81, 84, 81, 77], [79, 77, 74, 71, 74, 77, 79, 83],
    [84, 79, 76, 74, 72, 76, 79, 76], [74, 71, 67, 65, 67, 71, 74, 71]
  ];
  for (let bar = 0; bar < BARS; bar++) {
    const chord = chords[bar % 16], root = chord[0], start = bar * 4 * BEAT;
    for (let beat = 0; beat < 4; beat++) {
      const at = start + beat * BEAT;
      note(output, at, [root - 12, root - 5, root - 8, root - 1][beat], BEAT * .78, 'bass', .20, random);
      if (beat % 2 === 1) for (const pitch of chord) note(output, at + .012, pitch + 12, BEAT * .48, 'piano', .075, random);
      else note(output, at, root, BEAT * .55, 'piano', .09, random);
      drum(output, at, beat % 2 ? 'brush' : 'kick', beat % 2 ? .07 : .11, random);
      drum(output, at + BEAT * .66, 'block', .028, random);
      for (const pitch of chord.slice(1, 3)) note(output, at + BEAT * .66, pitch + 12, .09, 'banjo', .032, random);
    }
    const phrase = melody[bar % 16];
    for (let n = 0; n < 8; n++) {
      if ((bar % 4 === 3 && n > 4) || (bar >= 16 && n === 2)) continue;
      const onset = Math.floor(n / 2) + (n % 2 ? .66 : 0), duration = n % 2 ? .29 : .55;
      const variation = bar >= 16 && bar % 4 === 0 && n < 2 ? -12 : 0;
      note(output, start + onset * BEAT + random() * .004, phrase[n] + variation, duration * BEAT, bar % 8 < 4 ? 'reed' : 'brass', .10, random);
    }
    if (bar % 4 === 3) for (let n = 0; n < 4; n++) note(output, start + (2.5 + n * .33) * BEAT, chord[n] + 24, .11, 'piano', .10, random);
  }
  let peak = 0;
  for (const value of output) peak = Math.max(peak, Math.abs(value));
  for (let i = 0; i < output.length; i++) output[i] = Math.tanh(output[i] / peak * 1.05) * .83;
  return output;
}

const SCORES = {
  'silverscreen-theater': {
    chords: [[53,57,60,62],[50,54,57,60],[55,58,62,65],[48,52,55,58],[57,60,64,67],[50,54,57,60],[55,58,62,65],[48,52,55,58]],
    melody: [[77,81,84,86,84,81,79,77],[78,81,84,86,85,84,81,78],[79,82,86,89,86,82,81,79],[76,79,82,84,82,79,77,76],[81,84,88,91,88,86,84,81],[86,85,84,81,78,76,74,78],[79,82,86,89,88,86,82,79],[84,82,79,76,72,76,79,76]]
  },
  'moonlight-midway': {
    chords: [[50,53,57,62],[57,61,64,67],[50,53,57,62],[48,52,55,58],[53,57,60,65],[55,58,62,67],[57,61,64,67],[50,53,57,62]],
    melody: [[86,89,93,89,88,86],[85,88,91,88,85,81],[86,89,93,96,93,89],[84,88,91,88,86,84],[89,93,96,93,91,89],[91,94,98,94,93,91],[97,94,91,88,85,81],[86,89,93,89,88,86]]
  },
  'midnight-junction': {
    chords: [[43,47,50,53],[48,52,55,58],[43,47,50,53],[43,47,50,53],[48,52,55,58],[48,52,55,58],[50,54,57,60],[43,47,50,53]],
    melody: [[67,70,71,74,77,74,71,70],[72,75,76,79,82,79,76,75],[74,77,79,81,79,77,74,71],[70,71,74,77,74,71,69,67],[79,82,84,86,84,82,79,76],[82,79,76,75,72,76,79,82],[81,78,74,72,69,72,74,78],[79,77,74,71,70,69,67,71]]
  }
};

export function composeStage(id) {
  const stage = stageFor(id);
  if (stage.id === 'ink-harbor') return composeHarbor();
  const beat = 60 / stage.tempo, beats = stage.beats, score = SCORES[stage.id];
  const output = new Float32Array(Math.round(BARS * beats * beat * RATE)), random = noise(stage.tempo * 1937);
  const waltz = beats === 3, rail = stage.id === 'midnight-junction';
  // Original AABA arrangements: theater stride, minor-key carousel waltz, and railway shuffle.
  for (let bar = 0; bar < BARS; bar++) {
    const bridge = bar >= 16 && bar < 24, chord = score.chords[bar % 8].map(p => p + (bridge ? 5 : 0));
    const start = bar * beats * beat, phrase = score.melody[bar % 8];
    for (let b = 0; b < beats; b++) {
      const at = start + b * beat;
      if (!waltz || b === 0) note(output, at, chord[0] - 12 + (b % 2 ? 7 : 0), beat * .72, 'bass', .19, random);
      if (b > 0 || !waltz) for (const pitch of chord.slice(b % 2 ? 1 : 0)) {
        note(output, at + .008, pitch + (waltz ? 12 : 0), beat * (waltz ? .33 : .45), rail ? 'banjo' : 'piano', rail ? .055 : .065, random);
      }
      drum(output, at, b === 0 || (rail && b % 2 === 0) ? 'kick' : 'brush', .075, random);
      if (rail) {
        drum(output, at + beat * .66, 'brush', .055, random);
        drum(output, at + beat * .33, 'block', .026, random);
      } else if (!waltz) drum(output, at + beat * .64, 'block', .022, random);
    }
    for (let n = 0; n < beats * 2; n++) {
      if (bar % 4 === 3 && n >= beats * 2 - 2) continue;
      const onset = Math.floor(n / 2) + (n % 2 ? waltz ? .5 : .66 : 0);
      const pitch = phrase[n] + (bridge ? 5 : 0) + (bar >= 24 && n < 2 ? -12 : 0);
      const voice = waltz ? 'calliope' : rail ? bar % 8 < 4 ? 'brass' : 'reed' : bar % 8 < 4 ? 'piano' : 'reed';
      note(output, start + onset * beat, pitch, beat * (n % 2 ? .28 : .52), voice, waltz ? .075 : .11, random);
      if (!waltz && bar % 8 >= 4 && n % 2 === 0) note(output, start + onset * beat, pitch - 12, beat * .3, 'piano', .04, random);
    }
    if (bar % 4 === 3) for (let n = 0; n < 4; n++) note(output, start + (beats - 1 + n * .24) * beat, chord[n] + 24, beat * .17, waltz ? 'calliope' : 'piano', .075, random);
  }
  let peak = 0;
  for (const value of output) peak = Math.max(peak, Math.abs(value));
  for (let i = 0; i < output.length; i++) output[i] = Math.tanh(output[i] / peak * 1.05) * .83;
  return output;
}

export const EFFECTS = ['hit', 'heavy', 'block', 'swing', 'bell', 'ko', 'jump', 'land', 'dash', 'throw', 'special', 'spinach', 'select'];
export function effect(kind) {
  const duration = kind === 'ko' ? 1.1 : kind === 'bell' ? .85 : kind === 'spinach' ? .75 : .28;
  const output = new Float32Array(Math.round(duration * RATE)), random = noise(kind.length * 1931);
  let phase = 0, low = 0;
  for (let i = 0; i < output.length; i++) {
    const t = i / RATE, u = t / duration, n = random(); low += .12 * (n - low);
    let value = 0;
    if (kind === 'hit' || kind === 'heavy' || kind === 'throw') {
      const f = kind === 'hit' ? 155 : 90; phase += tau * (f * Math.exp(-t * 18) + 32) / RATE;
      value = Math.sin(phase) * Math.exp(-t * 19) * .7 + low * Math.exp(-t * 33) * 2;
      if (kind === 'throw') value += Math.sin(tau * 230 * t + 7 * Math.exp(-t * 20)) * Math.exp(-t * 13) * .25;
    } else if (kind === 'block' || kind === 'bell') {
      const f = kind === 'bell' ? 880 : 510;
      value = (Math.sin(tau * f * t) + .45 * Math.sin(tau * f * 2.76 * t)) * Math.exp(-t * (kind === 'bell' ? 5 : 25)) * .4;
    } else if (kind === 'swing' || kind === 'dash' || kind === 'land') value = (kind === 'land' ? low : n - low) * Math.sin(Math.PI * u) ** 3 * (kind === 'land' ? .8 : .2);
    else if (kind === 'jump' || kind === 'special') {
      phase += tau * (kind === 'jump' ? 180 + 1000 * u : 600 - 420 * u) / RATE;
      value = (Math.sin(phase) + .18 * Math.sin(phase * 2)) * Math.sin(Math.PI * u) * .34;
    } else if (kind === 'spinach') {
      phase += tau * (150 + Math.floor(u * 4) * 70) / RATE;
      value = (Math.sin(phase) + .3 * Math.sin(phase * 2)) * Math.sin(Math.PI * u) * .32;
    } else if (kind === 'ko') {
      const noteIndex = Math.min(3, Math.floor(t / .18));
      const elapsed = t - noteIndex * .18;
      value = Math.sin(tau * hz([72, 76, 79, 84][noteIndex]) * elapsed) * Math.exp(-elapsed * 7) * .4;
    } else value = Math.sin(tau * 660 * t) * Math.exp(-t * 35) * .35;
    output[i] = Math.tanh(value * 1.2) * Math.min(1, t * 700) * Math.min(1, (duration - t) * 200);
  }
  return output;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const directory = new URL('../assets/audio/', import.meta.url);
  await mkdir(directory, { recursive: true });
  for (const stage of STAGES) await writeFile(new URL(`${stage.id}.wav`, directory), wav(composeStage(stage.id)));
  for (const kind of EFFECTS) await writeFile(new URL(`${kind}.wav`, directory), wav(effect(kind)));
  console.log(`Rendered ${STAGES.length} original ${BARS}-bar stage scores and ${EFFECTS.length} Foley cues.`);
}
