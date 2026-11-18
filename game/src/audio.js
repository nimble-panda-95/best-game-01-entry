// Synthesised sound: every effect is built from oscillators and filtered
// noise at run time, so the game ships no audio files and works offline.
// The context is created on the first user gesture (autoplay rules).

const NOTES = {
  c5: 523.25, d5: 587.33, e5: 659.25, g5: 783.99, a5: 880.0, c6: 1046.5,
  e4: 329.63, g4: 392.0, a4: 440.0, c4: 261.63, d4: 293.66, e3: 164.81,
};

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.thrustGain = null;
    this.thrustOn = false;
    this.padStarted = false;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return true;
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return false;
    try {
      this.ctx = new Ctor();
    } catch {
      return false;
    }
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
    this.startPad();
    return true;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.5, this.ctx.currentTime, 0.02);
    }
  }

  toggleMuted() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  tone(freq, { type = 'sine', at = 0, dur = 0.18, vol = 0.3, slide = null } = {}) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + at;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  noise({ at = 0, dur = 0.25, vol = 0.3, filter = 800, type = 'lowpass' } = {}) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + at;
    const length = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filt = this.ctx.createBiquadFilter();
    filt.type = type;
    filt.frequency.value = filter;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt);
    filt.connect(gain);
    gain.connect(this.master);
    src.start(t0);
  }

  // A very quiet two-oscillator pad that sits under everything.
  startPad() {
    if (this.padStarted || !this.ctx) return;
    this.padStarted = true;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.035;
    gain.connect(this.master);
    [110.0, 164.81, 220.0].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.detune.value = (i - 1) * 4;
      osc.connect(gain);
      osc.start();
    });
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = 0.012;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start();
  }

  // Engine hum while thrusting; gain follows the thrust input.
  setThrust(active, strength = 1) {
    if (!this.ctx) return;
    if (active && !this.thrustOn) {
      const length = this.ctx.sampleRate;
      const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 320;
      this.thrustGain = this.ctx.createGain();
      this.thrustGain.gain.value = 0;
      src.connect(filt);
      filt.connect(this.thrustGain);
      this.thrustGain.connect(this.master);
      src.start();
      this.thrustSrc = src;
      this.thrustOn = true;
    }
    if (this.thrustOn && this.thrustGain) {
      const target = active ? 0.05 * strength + 0.02 : 0;
      this.thrustGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.08);
    }
  }

  play(name, option = {}) {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'pickup': {
        const step = Math.min(option.combo || 1, 5) - 1;
        const scale = [NOTES.e5, NOTES.g5, NOTES.a5, NOTES.c6, NOTES.c6 * 1.25];
        this.tone(scale[step], { type: 'triangle', dur: 0.16, vol: 0.32 });
        this.tone(scale[step] * 2, { type: 'sine', at: 0.05, dur: 0.22, vol: 0.18 });
        break;
      }
      case 'hit':
        this.noise({ dur: 0.3, vol: 0.4, filter: 500 });
        this.tone(160, { type: 'sawtooth', dur: 0.3, vol: 0.25, slide: 55 });
        break;
      case 'shieldBreak':
        this.tone(880, { type: 'square', dur: 0.12, vol: 0.16, slide: 220 });
        this.noise({ dur: 0.18, vol: 0.22, filter: 2400, type: 'highpass' });
        break;
      case 'powerup':
        this.tone(NOTES.a4, { type: 'triangle', dur: 0.12, vol: 0.28 });
        this.tone(NOTES.c6, { type: 'triangle', at: 0.08, dur: 0.2, vol: 0.28 });
        break;
      case 'gateOpen':
        [NOTES.c5, NOTES.e5, NOTES.g5, NOTES.c6].forEach((freq, i) => {
          this.tone(freq, { type: 'triangle', at: i * 0.07, dur: 0.3, vol: 0.24 });
        });
        break;
      case 'complete':
        [NOTES.e5, NOTES.g5, NOTES.a5, NOTES.c6, NOTES.e5 * 2].forEach((freq, i) => {
          this.tone(freq, { type: 'triangle', at: i * 0.09, dur: 0.34, vol: 0.26 });
        });
        break;
      case 'win':
        [NOTES.c5, NOTES.e5, NOTES.g5, NOTES.c6, NOTES.e5, NOTES.g5, NOTES.c6].forEach((freq, i) => {
          this.tone(freq, { type: 'triangle', at: i * 0.12, dur: 0.4, vol: 0.26 });
        });
        this.tone(NOTES.c4, { type: 'sine', dur: 0.9, vol: 0.2 });
        break;
      case 'lose':
        [NOTES.a4, NOTES.g4, NOTES.e4, NOTES.c4].forEach((freq, i) => {
          this.tone(freq, { type: 'sine', at: i * 0.16, dur: 0.3, vol: 0.26 });
        });
        this.tone(NOTES.e3, { type: 'sine', at: 0.5, dur: 0.7, vol: 0.2 });
        break;
      case 'click':
        this.tone(660, { type: 'square', dur: 0.05, vol: 0.12 });
        break;
      case 'denied':
        this.tone(180, { type: 'square', dur: 0.1, vol: 0.14, slide: 140 });
        break;
      default:
        break;
    }
  }
}
