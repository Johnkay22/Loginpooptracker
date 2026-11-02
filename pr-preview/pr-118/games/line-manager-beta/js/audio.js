(function(){
class GameAudio {
  ctx = null;
  master = null;
  sfx = null;
  muted = false;

  unlock() {
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window)
          .webkitAudioContext;
      this.ctx = new AC({ latencyHint: "interactive" });
      this.master = this.ctx.createGain();
      this.sfx = this.ctx.createGain();
      this.sfx.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.master.gain.value = this.muted ? 0 : 0.55;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.55, this.ctx.currentTime, 0.03);
    }
  }

  get ready() {
    return this.ctx && this.sfx && this.ctx.state === "running" && !this.muted;
  }

  envGain(duration, peak = 0.2) {
    if (!this.ctx || !this.sfx) return null;
    const g = this.ctx.createGain();
    g.connect(this.sfx);
    const t = this.ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    return g;
  }

  footstep() {
    if (!this.ready || !this.ctx) return;
    const g = this.envGain(0.07, 0.06);
    if (!g) return;
    const o = this.ctx.createOscillator();
    o.type = "triangle";
    const rate = 90 + Math.random() * 30;
    o.frequency.value = rate;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 420;
    o.connect(f);
    f.connect(g);
    o.start();
    o.stop(this.ctx.currentTime + 0.08);
  }

  latch() {
    if (!this.ready || !this.ctx) return;
    const g = this.envGain(0.12, 0.14);
    if (!g) return;
    const o = this.ctx.createOscillator();
    o.type = "square";
    o.frequency.setValueAtTime(520, this.ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(180, this.ctx.currentTime + 0.1);
    o.connect(g);
    o.start();
    o.stop(this.ctx.currentTime + 0.12);
  }

  flush() {
    if (!this.ready || !this.ctx) return;
    const t0 = this.ctx.currentTime;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.35, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.setValueAtTime(1400, t0);
    f.frequency.exponentialRampToValueAtTime(280, t0 + 0.32);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.34);
    src.connect(f);
    f.connect(g);
    g.connect(this.sfx);
    src.start();
    src.stop(t0 + 0.35);
  }

  ding() {
    if (!this.ready || !this.ctx) return;
    const t = this.ctx.currentTime;
    for (const [freq, delay, peak] of [
      [880, 0, 0.12],
      [1320, 0.07, 0.09],
    ]) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t + delay);
      g.gain.exponentialRampToValueAtTime(peak, t + delay + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.22);
      o.connect(g);
      g.connect(this.sfx);
      o.start(t + delay);
      o.stop(t + delay + 0.24);
    }
  }

  alert() {
    if (!this.ready || !this.ctx) return;
    const t = this.ctx.currentTime;
    for (const [freq, delay] of [
      [640, 0],
      [820, 0.11],
    ]) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = "square";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t + delay);
      g.gain.exponentialRampToValueAtTime(0.07, t + delay + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.1);
      o.connect(g);
      g.connect(this.sfx);
      o.start(t + delay);
      o.stop(t + delay + 0.12);
    }
  }

  shake() {
    if (!this.ready || !this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.envGain(0.18, 0.1);
    if (!g) return;
    o.type = "sawtooth";
    o.frequency.setValueAtTime(70, this.ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.16);
    o.connect(g);
    o.start();
    o.stop(this.ctx.currentTime + 0.18);
  }
}

window.GameAudio=GameAudio;
})();