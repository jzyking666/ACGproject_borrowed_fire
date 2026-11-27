import { scoreNotes, scores, type Instrument, type ScoreNote, type SoundScene } from './night-score';

type Channel = 'music' | 'effects' | 'ui';
type Source = OscillatorNode | AudioBufferSourceNode;
const gainValue = (n: number) => Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

interface Timbre { wave: OscillatorType; attack: number; peak: number; sustain: number; tail: number }
const instruments: Record<Instrument, Timbre> = {
  tine: { wave: 'sine', attack: .008, peak: .24, sustain: .32, tail: .46 },
  wood: { wave: 'sine', attack: .004, peak: .25, sustain: .10, tail: .12 },
  wire: { wave: 'triangle', attack: .009, peak: .24, sustain: .26, tail: .22 },
  reed: { wave: 'triangle', attack: .093, peak: .19, sustain: .82, tail: .18 },
  bass: { wave: 'sine', attack: .055, peak: .25, sustain: .58, tail: .19 },
  pad: { wave: 'sine', attack: .19, peak: .19, sustain: .85, tail: .36 },
};
const cooldown: Record<string, number> = {
  mirror: .11, charge: .42, emit: .16, expire: .36, reject: .25, lost: .32,
  ui: .045, ratchet: .048, 'timetable-key': .048, win: .65, hit: .23,
};
// The first gesture creates one audio graph for the entire game. All sounds are synthesized locally.
export class Sound {
  ctx?: AudioContext;
  master?: GainNode;
  muted = false;
  private channels?: Record<Channel, GainNode>;
  private scoreDuck?: GainNode;
  private noise?: AudioBuffer;
  private hidden = false;
  private musicEnabled = true;
  private volume = .7;
  private mix = { music: .8, effects: .9, ui: .7 };
  private scene: SoundScene = 'menu';
  private district = 0;
  private step = 0;
  private nextStep = 0;
  private lastSteps = new Map<SoundScene, number>();
  private lastPlayed = new Map<string, number>();
  private reflection = 0;
  private voices = new Map<Source, { channel: Channel; gain: GainNode; start: number }>();
  private previewUntil = 0;

  unlock() {
    if (this.hidden) return;
    try {
      if (!this.ctx) {
        const ctx = new AudioContext();
        this.ctx = ctx;
        const limiter = ctx.createDynamicsCompressor();
        limiter.threshold.value = -12; limiter.knee.value = 10; limiter.ratio.value = 5;
        limiter.attack.value = .004; limiter.release.value = .18;
        this.master = ctx.createGain();
        limiter.connect(this.master); this.master.connect(ctx.destination);
        this.channels = { music: ctx.createGain(), effects: ctx.createGain(), ui: ctx.createGain() };
        this.scoreDuck = ctx.createGain();
        this.scoreDuck.connect(this.channels.music);
        for (const bus of Object.values(this.channels)) bus.connect(limiter);
        this.master.gain.value = this.muted ? 0 : this.volume;
        for (const k of ['music','effects','ui'] as const) this.channels[k].gain.value = this.channelLevel(k);
        this.noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * .4), ctx.sampleRate);
        const samples = this.noise.getChannelData(0);
        let seed = 1735;
        for (let i = 0; i < samples.length; i++) {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          samples[i] = seed / 0x80000000 - 1;
        }
      }
      if (this.ctx.state !== 'running') void this.ctx.resume().catch(() => {});
    } catch { /* The game remains playable on a device without an audio output. */ }
  }
  private channelLevel(channel: Channel) {
    return channel === 'music' && !this.musicEnabled ? 0 : this.mix[channel];
  }
  private level(param: AudioParam | undefined, value: number) {
    if (param && this.ctx) {
      const now = this.ctx.currentTime;
      param.cancelScheduledValues(now);
      param.setTargetAtTime(value, now, .014);
    }
  }
  mute(value: boolean) {
    if (this.muted === value) return;
    this.muted = value;
    if (value) this.release();
    this.setVolume(this.volume);
  }
  setVolume(value: number) {
    this.volume = gainValue(value);
    this.level(this.master?.gain, this.muted || this.hidden ? 0 : this.volume);
  }
  setMusic(value: boolean) {
    if (value === this.musicEnabled) return;
    this.musicEnabled = value;
    if (!value) this.release('music');
    this.level(this.channels?.music.gain, this.channelLevel('music'));
  }
  setMix(music: number, effects: number, ui: number) {
    this.mix = { music: gainValue(music), effects: gainValue(effects), ui: gainValue(ui) };
    for (const channel of ['music','effects','ui'] as const) this.level(this.channels?.[channel].gain, this.channelLevel(channel));
  }
  setBackground(hidden: boolean) {
    if (this.hidden === hidden) return;
    this.hidden = hidden;
    const ctx = this.ctx;
    if (!ctx) return;
    this.setVolume(this.volume);
    this.nextStep = ctx.currentTime + .04;
    if (hidden) {
      this.release();
      this.lastPlayed.clear();
      void ctx.suspend().catch(() => {});
    } else {
      // Queue after a suspend even if audioContext.state has not acknowledged it yet.
      void ctx.resume().catch(() => {});
    }
  }
  setScene(kind: SoundScene, district = 0) {
    const area = Number.isInteger(district) && district >= 0 && district < 8 ? district : 0;
    if (this.scene === kind && this.district === area) return;
    this.lastSteps.set(this.scene, this.step);
    this.scene = kind; this.district = area;
    const bar = scores[kind].backing.length;
    this.step = Math.ceil((this.lastSteps.get(kind) ?? 0) / bar) * bar;
    this.nextStep = (this.ctx?.currentTime ?? 0) + .12;
    this.release('music');
  }
  private release(channel?: Channel) {
    const now = this.ctx?.currentTime ?? 0;
    for (const [source, voice] of this.voices) {
      if (channel && voice.channel !== channel) continue;
      this.voices.delete(source);
      if (voice.start > now || this.hidden) {
        source.stop(now);
      } else {
        const param = voice.gain.gain;
        if (typeof param.cancelAndHoldAtTime === 'function') param.cancelAndHoldAtTime(now);
        else { const v = param.value; param.cancelScheduledValues(now); param.setValueAtTime(v, now); }
        param.linearRampToValueAtTime(0, now + .055); source.stop(now + .06);
      }
    }
    this.previewUntil = 0;
  }
  tick(powered: number, running: boolean) {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || this.hidden || this.muted || !this.volume || !this.channelLevel('music')) return;
    const now = ctx.currentTime;
    if (now < this.previewUntil) return;
    if ((this.scene === 'room' || this.scene === 'tram') && !running) { this.nextStep = now + .04; return; }
    const beat = 30 / scores[this.scene].bpm;
    // A delayed or backgrounded frame resumes from one note, instead of replaying missed bars.
    this.nextStep = Math.max(this.nextStep, now + .008);
    while (this.nextStep <= now + .12) {
      for (const note of scoreNotes(this.scene, this.district, this.step, gainValue(powered))) this.instrument(note, beat, this.nextStep);
      this.step++; this.nextStep += beat;
    }
  }
  previewMusic(scene: SoundScene = this.scene) {
    const ctx = this.ctx;
    if (!ctx || this.hidden || this.muted || !this.channelLevel('music') || !this.volume) return;
    this.release('music');
    const start = ctx.currentTime + .012;
    const beat = 30 / scores[scene].bpm;
    const steps = scores[scene].backing.length * 2;
    for (let i = 0; i < steps; i++) {
      for (const note of scoreNotes(scene, this.district, i, 1)) this.instrument(note, beat, start + i * beat);
    }
    this.previewUntil = start + steps * beat;
  }
  stopPreview() {
    if (this.ctx && this.previewUntil > this.ctx.currentTime) this.release('music');
  }
  private instrument(note: ScoreNote, beat: number, when: number) {
    const t = instruments[note.instrument], frequency = hz(note.midi);
    const duration = Math.max(.09, note.beats * beat + t.tail);
    this.tone('music', when, frequency, duration, t.wave, t.peak * note.level, t.attack, t.sustain, t.tail, note.pan);
    if (note.instrument === 'tine' || note.instrument === 'wood') {
      const ratio = note.instrument === 'tine' ? 2.76 : 3.94;
      this.tone('music', when, frequency * ratio, Math.min(duration, .16), 'sine', .065 * note.level, .005, .09, .09, note.pan);
    }
    if (note.instrument === 'reed' || note.instrument === 'pad') {
      this.tone('music', when + .018, frequency * 1.003, duration, 'sine', .038 * note.level, t.attack, t.sustain, t.tail, -.18);
    }
  }

  /** Each transient owns its envelope. Sources and their optional filters and panners are freed on end. */
  private voice(channel: Channel, source: Source, when: number, duration: number, peak: number,
    attack: number, sustain: number, tail: number, pan: number, filter?: BiquadFilterNode) {
    const ctx = this.ctx!, output = channel === 'music' ? this.scoreDuck! : this.channels![channel];
    const gain = ctx.createGain(), end = when + duration;
    const top = when + Math.min(attack, duration * .4);
    const release = Math.max(top + .001, end - tail);
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(peak, top);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0001, peak * sustain), release);
    gain.gain.exponentialRampToValueAtTime(.0001, end);
    gain.gain.linearRampToValueAtTime(0, end + .004);
    if (filter) { source.connect(filter); filter.connect(gain); } else source.connect(gain);
    const panner = pan && typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : undefined;
    if (panner) { panner.pan.value = pan; gain.connect(panner); panner.connect(output); } else gain.connect(output);
    source.onended = () => { this.voices.delete(source); source.disconnect(); gain.disconnect(); filter?.disconnect(); panner?.disconnect(); };
    this.voices.set(source, { channel, gain, start: when });
    source.start(when); source.stop(end + .006);
  }
  private tone(channel: Channel, when: number, frequency: number, duration: number, wave: OscillatorType, peak: number,
    attack: number, sustain: number, tail: number, pan = 0, endHz?: number) {
    const osc = this.ctx!.createOscillator();
    osc.type = wave; osc.frequency.setValueAtTime(frequency, when);
    if (endHz) osc.frequency.exponentialRampToValueAtTime(endHz, when + duration * .83);
    this.voice(channel, osc, when, duration, peak, attack, sustain, tail, pan);
  }
  private brush(channel: Channel, when: number, center: number, duration: number, peak: number) {
    if (!this.noise) return;
    const ctx = this.ctx!, noise = ctx.createBufferSource(), filter = ctx.createBiquadFilter();
    noise.buffer = this.noise; filter.type = 'bandpass';
    filter.frequency.setValueAtTime(center, when); filter.frequency.exponentialRampToValueAtTime(center * .6, when + duration);
    filter.Q.value = .75;
    this.voice(channel, noise, when, duration, peak, .003, .24, duration * .52, 0, filter);
  }
  play(event: string) {
    const ctx = this.ctx;
    const channel = event === 'ui' || event === 'page' ? 'ui' : 'effects';
    if (!ctx || this.hidden || this.muted || !this.volume || !this.channelLevel(channel)) return;
    const group = event === 'reflect' || event.startsWith('prism-') ? 'mirror' : event;
    const now = ctx.currentTime, limit = cooldown[group] ?? 0;
    if (now - (this.lastPlayed.get(group) ?? -Infinity) < limit) return;
    this.lastPlayed.set(group, now);
    const tap = (freq: number, length: number, volume: number, delay = 0, endHz?: number, wave: OscillatorType = 'sine') =>
      this.tone(channel, now + .004 + delay, freq, length, wave, volume, .004, .42, length * .55, 0, endHz);
    const noise = (center: number, length: number, volume: number, delay = 0) => this.brush(channel, now + .004 + delay, center, length, volume);
    const completion = event === 'win' || event === 'tram-bell';
    if ((event === 'hit' || completion || event === 'reject') && this.scoreDuck) {
      const gain = this.scoreDuck.gain;
      gain.cancelScheduledValues(now); gain.setTargetAtTime(.48, now, .018);
      gain.setTargetAtTime(1, now + (completion ? .65 : .26), .22);
    }
    switch (event) {
      case 'ui': tap(540,.045,.075,0,415); break;
      case 'page': noise(1600,.12,.21); noise(2700,.06,.11,.07); break;
      case 'ratchet': noise(2700,.035,.28); tap(310,.06,.12,.012,176,'triangle'); noise(1600,.04,.2,.054); break;
      case 'timetable-key': tap(234,.064,.18,0,140); noise(1480,.044,.22,.023); break;
      case 'postmark': tap(112,.12,.40,0,55); noise(670,.09,.46); noise(3100,.08,.16,.12); tap(698,.38,.09,.18); break;
      case 'tram-bell':
        for (const offset of [0,.22]) { tap(642,.67,.23,offset,637); tap(1590,.18,.075,offset); }
        noise(770,.23,.09,.55); break;
      case 'harbor-bell': tap(388,.58,.21); tap(972,.21,.09,.01); break;
      case 'prism-warm': tap(392,.27,.18); tap(588,.20,.08,.03); break;
      case 'prism-cool': tap(784,.17,.14); tap(1175,.22,.065,.045); break;
      case 'reflect': tap([392,440,330,392,294][this.reflection++ % 5],.095,.13); noise(2160,.025,.08); break;
      case 'charge': tap(294,.22,.18); tap(440,.27,.17,.1); tap(588,.33,.12,.2); break;
      case 'reject': tap(415,.13,.18,0,340,'triangle'); tap(312,.20,.17,.12,240,'triangle'); break;
      case 'expire': tap(294,.21,.14,0,245); tap(196,.45,.14,.16,147); break;
      case 'lost': noise(710,.10,.17); break;
      case 'record': tap(294,.11,.15); tap(392,.18,.16,.12); break;
      case 'echo': tap(392,.25,.16); tap(392,.2,.075,.2); tap(588,.32,.07,.34); break;
      case 'teleport': tap(196,.19,.15,0,588,'triangle'); tap(588,.27,.12,.12,294); break;
      case 'phase': tap(492,.14,.14,0,660); break;
      case 'emit': tap(92,.23,.26,0,165); noise(1050,.07,.15); break;
      case 'pickup': noise(1150,.06,.19); tap(259,.16,.18,.02,316,'triangle'); break;
      case 'drop': tap(169,.16,.25,0,96,'triangle'); noise(1280,.10,.22); break;
      case 'rotate': noise(2400,.043,.23); tap(498,.12,.15,.02,345); break;
      case 'switch': noise(1090,.065,.3); tap(176,.09,.13,0,97); break;
      case 'hit': noise(920,.24,.55); tap(92,.38,.3,0,46,'triangle'); break;
      case 'win': [64,69,67,74].forEach((midi,i) => tap(hz(midi),.66,.21,i*.17)); tap(147,.86,.18); break;
    }
  }
}
