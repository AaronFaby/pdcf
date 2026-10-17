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
    this.voices = new Set(); this.loading = null; this.error = false; this.lastCue = new Map();
  }
  configure(values) {
    this.settings = audioSettings({ ...this.settings, ...values });
    try { window.localStorage.setItem(KEY, JSON.stringify(this.settings)); } catch { /* Storage can be disabled. */ }
    this.mix();
  }
  async unlock() {
    if (!this.settings.enabled) return;
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
      await this.context.resume();
      this.error = false;
      this.loading ||= Promise.all(['ink-harbor', ...CUES].map(async name => {
        const response = await fetch(new URL(`../audio/${name}.wav`, import.meta.url));
        if (!response.ok) throw new Error('Audio asset unavailable');
        this.buffers.set(name, await this.context.decodeAudioData(await response.arrayBuffer()));
      })).catch(error => { this.loading = null; throw error; });
      await this.loading;
      this.mix();
    } catch { this.error = true; }
  }
  setScene(scene) { this.scene = scene; this.mix(); }
  mix() {
    if (!this.context || !this.musicGain) return;
    const on = this.settings.enabled && this.scene !== 'paused';
    const now = this.context.currentTime;
    this.musicGain.gain.setTargetAtTime(on ? this.settings.music * (this.scene === 'menu' ? .55 : .85) : 0, now, .04);
    this.fxGain.gain.setTargetAtTime(on ? this.settings.effects * .7 : 0, now, .025);
    if (!on) {
      if (this.source) { this.source.stop(now + .18); this.source = null; }
      for (const voice of this.voices) { try { voice.stop(now + .12); } catch { /* A cue may have just ended. */ } }
      this.voices.clear();
    } else if (!this.source && this.buffers.has('ink-harbor')) {
      const source = this.context.createBufferSource(); source.buffer = this.buffers.get('ink-harbor'); source.loop = true;
      source.onended = () => source.disconnect();
      source.connect(this.musicGain); source.start(0, this.offset || 0); this.started = now; this.source = source;
    }
  }
  pause() {
    if (this.source) this.offset = ((this.offset || 0) + this.context.currentTime - this.started) % this.source.buffer.duration;
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
