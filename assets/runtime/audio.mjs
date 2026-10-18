import { stageFor } from './stages.mjs';

const KEY = 'pdcf-audio-v1';
const DEFAULTS = { enabled: true, music: .45, effects: .7 };
const CUES = ['hit', 'heavy', 'block', 'swing', 'bell', 'ko', 'jump', 'land', 'dash', 'throw', 'special', 'spinach', 'select'];

export function audioSettings(value) {
  return {
    enabled: typeof value?.enabled === 'boolean' ? value.enabled : DEFAULTS.enabled,
    music: typeof value?.music === 'number' && Number.isFinite(value.music) ? Math.min(1, Math.max(0, value.music)) : DEFAULTS.music,
    effects: typeof value?.effects === 'number' && Number.isFinite(value.effects) ? Math.min(1, Math.max(0, value.effects)) : DEFAULTS.effects
  };
}

export class GameAudio {
  constructor() {
    try { this.settings = audioSettings(JSON.parse(window.localStorage.getItem(KEY))); } catch { this.settings = { ...DEFAULTS }; }
    this.context = null; this.buffers = new Map(); this.scene = 'menu'; this.source = null;
    this.voices = new Set(); this.loading = new Map(); this.error = false; this.lastCue = new Map();
    this.track = 'ink-harbor';
  }
  configure(values) {
    this.settings = audioSettings({ ...this.settings, ...values });
    try { window.localStorage.setItem(KEY, JSON.stringify(this.settings)); } catch { /* Storage can be disabled. */ }
    this.mix();
  }
  async unlock() {
    if (!this.settings.enabled) return;
    const track = this.track, attempt = this.attempt = (this.attempt || 0) + 1;
    let timer;
    try {
      this.context ||= new (window.AudioContext || window.webkitAudioContext)();
      if (!this.musicGain) {
        this.musicGain = this.context.createGain(); this.fxGain = this.context.createGain();
        this.musicGain.gain.value = 0; this.fxGain.gain.value = 0;
        const limiter = this.context.createDynamicsCompressor();
        limiter.threshold.value = -6; limiter.knee.value = 6; limiter.ratio.value = 8;
        limiter.attack.value = .003; limiter.release.value = .12;
        this.musicGain.connect(limiter); this.fxGain.connect(limiter); limiter.connect(this.context.destination);
      }
      // A missing output device can leave resume pending indefinitely in Firefox.
      await Promise.race([
        this.context.resume(),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Audio output did not start')), 5000); })
      ]);
      clearTimeout(timer);
      await Promise.all([track, ...CUES].map(name => {
        if (this.buffers.has(name)) return;
        if (!this.loading.has(name)) {
          const pending = (async () => {
            const response = await fetch(new URL(`../audio/${name}.wav`, import.meta.url));
            if (!response.ok) throw new Error('Audio asset unavailable');
            this.buffers.set(name, await this.context.decodeAudioData(await response.arrayBuffer()));
          })().finally(() => this.loading.delete(name));
          this.loading.set(name, pending);
        }
        return this.loading.get(name);
      }));
      if (track === this.track && attempt === this.attempt) { this.error = false; this.mix(); }
    } catch { if (track === this.track && attempt === this.attempt) this.error = true; }
    finally { clearTimeout(timer); }
  }
  async setStage(id) {
    const next = stageFor(id).id;
    if (next === this.track) return;
    this.stopMusic(); this.track = next; this.offset = 0; this.error = false;
    if (this.context && this.settings.enabled) await this.unlock();
  }
  stopMusic() {
    if (!this.source) return;
    const now = this.context.currentTime, source = this.source;
    this.offset = ((this.offset || 0) + now - this.started) % source.buffer.duration;
    source.fade.gain.setTargetAtTime(0, now, .025); source.stop(now + .12); this.source = null;
  }
  setScene(scene) { this.scene = scene; this.mix(); }
  mix() {
    if (!this.context || !this.musicGain) return;
    const on = this.settings.enabled && this.scene !== 'paused';
    const now = this.context.currentTime;
    this.musicGain.gain.setTargetAtTime(on ? this.settings.music * (this.scene === 'menu' ? .55 : .85) : 0, now, .04);
    this.fxGain.gain.setTargetAtTime(on ? this.settings.effects * .7 : 0, now, .025);
    if (!on) {
      this.stopMusic();
      for (const voice of this.voices) { try { voice.stop(now + .12); } catch { /* A cue may have just ended. */ } }
      this.voices.clear();
    } else if (!this.source && this.buffers.has(this.track)) {
      const source = this.context.createBufferSource(); source.buffer = this.buffers.get(this.track); source.loop = true;
      source.fade = this.context.createGain(); source.fade.gain.value = 0;
      source.fade.gain.setTargetAtTime(1, now, .04);
      source.onended = () => { source.disconnect(); source.fade.disconnect(); };
      source.connect(source.fade); source.fade.connect(this.musicGain);
      source.start(0, this.offset || 0); this.started = now; this.source = source;
    }
  }
  pause() {
    this.setScene('paused');
  }
  play(event) {
    if (!this.context || this.context.state !== 'running' || !this.settings.enabled || this.scene === 'paused') return;
    const name = event.type === 'hit' && event.heavy ? 'heavy' : event.type;
    const buffer = this.buffers.get(name), now = this.context.currentTime;
    if (!buffer || this.voices.size >= 16 || now - (this.lastCue.get(name) ?? -1) < .035) return;
    this.lastCue.set(name, now);
    const voice = this.context.createBufferSource(); voice.buffer = buffer;
    voice.playbackRate.value = name === 'hit' || name === 'swing' ? 1 + ((event.index || 0) ? -.045 : .035) : 1;
    voice.connect(this.fxGain); this.voices.add(voice);
    voice.onended = () => { voice.disconnect(); this.voices.delete(voice); };
    voice.start();
  }
}
