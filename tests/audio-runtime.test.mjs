import test from 'node:test';
import assert from 'node:assert/strict';
import { GameAudio } from '../assets/runtime/audio.mjs';

class AudioContextFixture {
  constructor() { this.currentTime = 0; this.state = 'suspended'; this.destination = {}; this.sources = []; }
  async resume() { this.state = 'running'; }
  async decodeAudioData() { return { duration: 53.333 }; }
  createGain() { return { gain: { value: 0, setTargetAtTime(value) { this.value = value; } }, connect() {}, disconnect() { this.disconnected = true; } }; }
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

test('a stalled audio output times out, retries, and ignores a late resume', async t => {
  const previousWindow = globalThis.window, previousFetch = globalThis.fetch;
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let finishResume, requests = 0;
  class StalledContext extends AudioContextFixture {
    resume() { return new Promise(resolve => { finishResume = resolve; }); }
  }
  try {
    globalThis.window = { AudioContext: StalledContext };
    globalThis.fetch = async () => { requests++; return { ok: true, arrayBuffer: async () => new ArrayBuffer(4) }; };
    const audio = new GameAudio(), pending = audio.unlock();
    assert.equal(audio.error, false); assert.equal(requests, 0);
    t.mock.timers.tick(5000); await pending;
    assert.equal(audio.error, true); assert.equal(audio.source, null);
    finishResume(); await Promise.resolve();
    assert.equal(audio.error, true); assert.equal(requests, 0, 'late resume cannot finish the timed-out attempt');
    audio.context.resume = AudioContextFixture.prototype.resume;
    await audio.unlock();
    assert.equal(audio.error, false); assert.ok(audio.source); assert.equal(requests, 14);
    audio.context.resume = StalledContext.prototype.resume;
    const stale = audio.unlock();
    audio.context.resume = AudioContextFixture.prototype.resume;
    await audio.unlock();
    t.mock.timers.tick(10000); await stale;
    assert.equal(audio.error, false, 'an older timeout cannot overwrite a successful retry');
  } finally { globalThis.window = previousWindow; globalThis.fetch = previousFetch; }
});

test('stalled audio fetches, bodies and decodes expire, retry only missing assets, and cannot overwrite a retry', async t => {
  const previousWindow = globalThis.window, previousFetch = globalThis.fetch;
  t.mock.timers.enable({ apis: ['setTimeout'] });
  try {
    for (const phase of ['fetch', 'body', 'decode']) {
      let release, signal, requests = 0;
      class Context extends AudioContextFixture {
        decodeAudioData(data) { return new Uint8Array(data)[0] === 1 && phase === 'decode' ? new Promise(resolve => { release = resolve; }) : Promise.resolve({ duration: 53.333 }); }
      }
      globalThis.window = { AudioContext: Context };
      const data = new Uint8Array([1]).buffer;
      globalThis.fetch = async (url, options) => {
        requests++;
        if (!url.pathname.endsWith('ink-harbor.wav')) return { ok: true, arrayBuffer: async () => new ArrayBuffer(1) };
        signal = options?.signal;
        if (phase === 'fetch') return new Promise(resolve => { release = resolve; });
        return { ok: true, arrayBuffer: () => phase === 'body' ? new Promise(resolve => { release = resolve; }) : Promise.resolve(data) };
      };
      const audio = new GameAudio(), pending = audio.unlock();
      for (let i = 0; i < 12; i++) await Promise.resolve();
      assert.equal(requests, 14); assert.equal(audio.starting, true);
      t.mock.timers.tick(15000); await pending;
      assert.equal(audio.error, true); assert.equal(audio.starting, false); assert.equal(audio.loading.size, 0);
      assert.equal(signal.aborted, true); assert.equal(audio.buffers.has('ink-harbor'), false);
      globalThis.fetch = async () => { requests++; return { ok: true, arrayBuffer: async () => new ArrayBuffer(1) }; };
      await audio.unlock(); const restored = audio.buffers.get('ink-harbor');
      assert.equal(requests, 15); assert.equal(audio.error, false); assert.ok(audio.source);
      release(phase === 'fetch' ? { ok: true, arrayBuffer: async () => data } : phase === 'body' ? data : { duration: 999 });
      for (let i = 0; i < 12; i++) await Promise.resolve();
      assert.equal(audio.buffers.get('ink-harbor'), restored); assert.equal(audio.error, false);
    }
  } finally { globalThis.window = previousWindow; globalThis.fetch = previousFetch; }
});

test('stage scores load on demand, switch without stale playback, and preserve pause/mute', async () => {
  const previousWindow = globalThis.window, previousFetch = globalThis.fetch;
  try {
    const requests = [];
    globalThis.window = { AudioContext: AudioContextFixture };
    globalThis.fetch = async url => { requests.push(url.pathname); return { ok: true, arrayBuffer: async () => new ArrayBuffer(4) }; };
    const audio = new GameAudio(); await audio.unlock();
    assert.equal(requests.length, 14); assert.ok(!requests.some(path => path.includes('midnight-junction')));
    const harbor = audio.source; audio.context.currentTime = 7;
    await audio.setStage('silverscreen-theater');
    assert.ok(harbor.stopped); assert.equal(audio.track, 'silverscreen-theater');
    harbor.onended(); assert.equal(harbor.fade.disconnected, true);
    assert.equal(audio.source.buffer, audio.buffers.get('silverscreen-theater')); assert.deepEqual(audio.source.startArgs, [0, 0]);
    assert.equal(requests.length, 15, 'cached Foley is not downloaded again');
    audio.context.currentTime = 11; audio.pause();
    audio.setScene('fight'); assert.deepEqual(audio.source.startArgs, [0, 4]);
    audio.configure({ enabled: false }); await audio.setStage('moonlight-midway');
    assert.equal(audio.source, null); assert.equal(requests.length, 15, 'mute does not fetch another track');
    audio.configure({ enabled: true }); await audio.unlock();
    assert.equal(audio.source.buffer, audio.buffers.get('moonlight-midway'));
    audio.pause(); await audio.setStage('midnight-junction'); assert.equal(audio.source, null);
    audio.setScene('fight'); assert.equal(audio.source.buffer, audio.buffers.get('midnight-junction'));
    const count = requests.length; await audio.setStage('ink-harbor');
    assert.equal(requests.length, count, 'returning to a cached stage needs no new request');
  } finally { globalThis.window = previousWindow; globalThis.fetch = previousFetch; }
});

test('rapid stage switches ignore late loads and stale failures, and a failed score can retry', async () => {
  const previousWindow = globalThis.window, previousFetch = globalThis.fetch;
  try {
    globalThis.window = { AudioContext: AudioContextFixture };
    let releaseTheater;
    globalThis.fetch = async url => url.pathname.endsWith('silverscreen-theater.wav')
      ? new Promise(resolve => { releaseTheater = resolve; })
      : { ok: true, arrayBuffer: async () => new ArrayBuffer(4) };
    const audio = new GameAudio(); await audio.unlock();
    const pending = audio.setStage('silverscreen-theater');
    await Promise.resolve();
    await audio.setStage('midnight-junction'); const train = audio.source;
    releaseTheater({ ok: false }); await pending;
    assert.equal(audio.source, train); assert.equal(audio.error, false);
    const later = audio.setStage('silverscreen-theater'); await Promise.resolve();
    await audio.setStage('midnight-junction'); const current = audio.source;
    releaseTheater({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) }); await later;
    assert.equal(audio.source, current, 'late success cannot replace the selected score');
    globalThis.fetch = async () => ({ ok: false }); await audio.setStage('moonlight-midway');
    assert.equal(audio.error, true); assert.equal(audio.source, null);
    audio.play({ type: 'hit' }); assert.equal(audio.voices.size, 1, 'a score failure leaves cached effects usable');
    globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) });
    await audio.unlock(); assert.equal(audio.error, false); assert.equal(audio.source.buffer, audio.buffers.get('moonlight-midway'));
  } finally { globalThis.window = previousWindow; globalThis.fetch = previousFetch; }
});
