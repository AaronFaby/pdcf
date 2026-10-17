import test from 'node:test';
import assert from 'node:assert/strict';
import { GameAudio } from '../assets/runtime/audio.mjs';

class AudioContextFixture {
  constructor() { this.currentTime = 0; this.state = 'suspended'; this.destination = {}; this.sources = []; }
  async resume() { this.state = 'running'; }
  async decodeAudioData() { return { duration: 53.333 }; }
  createGain() { return { gain: { value: 0, setTargetAtTime(value) { this.value = value; } }, connect() {} }; }
  createDynamicsCompressor() { return { threshold: {}, knee: {}, ratio: {}, attack: {}, release: {}, connect() {} }; }
  createBufferSource() {
    const source = { playbackRate: { value: 1 }, connect() {}, disconnect() {}, start(...args) { this.startArgs = args; }, stop() { this.stopped = true; } };
    this.sources.push(source); return source;
  }
}

test('audio unlock is idempotent, pause resumes at the right offset, and mute stops every voice', async () => {
  const previousWindow = globalThis.window, previousFetch = globalThis.fetch;
  try {
    globalThis.window = { AudioContext: AudioContextFixture };
    globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) });
    const audio = new GameAudio();
    await audio.unlock(); const first = audio.source;
    await audio.unlock(); assert.equal(audio.source, first);
    audio.setScene('fight'); audio.context.currentTime = 8; audio.play({ type: 'hit' });
    assert.equal(audio.voices.size, 1); audio.pause();
    assert.ok(first.stopped); assert.equal(audio.source, null); assert.equal(audio.voices.size, 0);
    audio.setScene('fight'); assert.deepEqual(audio.source.startArgs, [0, 8]);
    audio.configure({ enabled: false }); assert.equal(audio.source, null);
    audio.configure({ enabled: true }); assert.ok(audio.source);
    audio.pause(); audio.play({ type: 'bell' }); assert.equal(audio.voices.size, 0);
  } finally { globalThis.window = previousWindow; globalThis.fetch = previousFetch; }
});

test('an unavailable audio asset fails quietly and can be retried without interrupting gameplay', async () => {
  const previousWindow = globalThis.window, previousFetch = globalThis.fetch;
  try {
    globalThis.window = { AudioContext: AudioContextFixture };
    globalThis.fetch = async () => ({ ok: false });
    const audio = new GameAudio(); await audio.unlock();
    assert.equal(audio.error, true); assert.equal(audio.source, null);
    globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) });
    await audio.unlock(); assert.equal(audio.error, false); assert.ok(audio.source);
  } finally { globalThis.window = previousWindow; globalThis.fetch = previousFetch; }
});
