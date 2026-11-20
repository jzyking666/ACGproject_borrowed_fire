// Original procedural sound: no downloaded music, samples, or copyrighted assets.
export class Sound {
  ctx?: AudioContext;
  master?: GainNode;
  private musicBus?: GainNode;
  private volume = .7;
  private musicEnabled = true;
  private nextBeat = 0;
  private beat = 0;
  muted = false;
  private lastReflect = 0;
  private note = 0;
  unlock() {
    if (!this.ctx) {
      this.ctx = new AudioContext(); this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume * .3; this.master.connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = .2; this.musicBus.connect(this.master);
    }
    void this.ctx.resume();
  }
  mute(value: boolean) { this.muted = value; this.setVolume(this.volume); }
  setVolume(value: number) { this.volume = Math.max(0, Math.min(1, value)); if (this.ctx && this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume * .3, this.ctx.currentTime, .03); }
  setMusic(value: boolean) { this.musicEnabled = value; }
  tick(powered: number, running: boolean) {
    if (!this.ctx || !this.musicBus) return;
    this.musicBus.gain.setTargetAtTime(running && this.musicEnabled ? .12 + powered * .1 : 0, this.ctx.currentTime, .12);
    if (!running || !this.musicEnabled || this.muted || this.ctx.state !== 'running') { this.nextBeat = this.ctx.currentTime; return; }
    if (this.ctx.currentTime < this.nextBeat) return;
    this.nextBeat = this.ctx.currentTime + .48;
    const melody = [0, 7, 10, 7, 3, 7, 12, 10], root = 110;
    this.tone(root * 2 ** (melody[this.beat % 8] / 12), .7, 'sine', .13, 0, true);
    if (this.beat % 4 === 0) this.tone(55, 1.7, 'triangle', .12, 0, true);
    if (powered > .4 && this.beat % 2 === 0) this.tone(root * 2 ** ((melody[this.beat % 8] + 12) / 12), .35, 'sine', .06, .06, true);
    this.beat++;
  }
  tone(hz: number, duration = .16, type: OscillatorType = 'sine', volume = .25, offset = 0, music = false) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + offset, osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(hz, t);
    gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(volume, t + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
    osc.connect(gain); gain.connect(music && this.musicBus ? this.musicBus : this.master); osc.start(t); osc.stop(t + duration + .02);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
  play(event: string) {
    switch (event) {
      case 'reflect': {
        const now = performance.now(); if (now - this.lastReflect < 55) return;
        this.lastReflect = now; this.tone([220, 293.66, 329.63, 440, 493.88][this.note++ % 5] * 2, .22, 'sine', .14); break;
      }
      case 'charge': [220, 330, 440].forEach((f, i) => this.tone(f, .5, 'sine', .11, i * .04)); break;
      case 'emit': this.tone(100, .3, 'triangle', .15); this.tone(420, .15, 'sine', .12, .03); break;
      case 'pickup': this.tone(330, .12, 'triangle'); this.tone(490, .12, 'sine', .15, .06); break;
      case 'drop': this.tone(180, .15, 'triangle', .2); break;
      case 'rotate': this.tone(620, .07, 'triangle', .12); break;
      case 'switch': this.tone(130, .22, 'square', .08); break;
      case 'hit': this.tone(65, .45, 'sawtooth', .15); this.tone(92, .35, 'triangle', .2); break;
      case 'win': [261.63, 329.63, 392, 523.25, 659.25].forEach((f, i) => this.tone(f, .9, 'sine', .18, i * .12)); break;
      case 'ui': this.tone(700, .07, 'sine', .1); break;
    }
  }
}
