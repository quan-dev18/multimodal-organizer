/**
 * SoundManager – Programmatic UI sound effects via Web Audio API.
 *
 * Usage:
 *   import { sfx } from '@/lib/sounds';
 *   sfx.play('click');
 *
 * No external audio files are needed – every sound is synthesised
 * on the fly using short oscillator + gain‑envelope combos.
 */

type SoundName =
  | 'click'
  | 'success'
  | 'error'
  | 'hover'
  | 'navigate'
  | 'toggle'
  | 'download'
  | 'complete'
  | 'delete'
  | 'scan';

class SoundManager {
  private ctx: AudioContext | null = null;
  private _volume = 0.35;
  private _muted = false;

  /* ── public API ─────────────────────────────────────── */

  get volume(): number {
    return this._volume;
  }

  set volume(v: number) {
    this._volume = Math.max(0, Math.min(1, v));
  }

  get muted(): boolean {
    return this._muted;
  }

  set muted(m: boolean) {
    this._muted = m;
  }

  toggleMute(): boolean {
    this._muted = !this._muted;
    return this._muted;
  }

  /**
   * Fire‑and‑forget: plays the named sound.
   * Returns immediately – never throws.
   */
  play(name: SoundName): void {
    try {
      if (this._muted) return;
      if (this.prefersReducedMotion()) return;
      this.ensureContext();
      if (!this.ctx) return;

      const fn = this.sounds[name];
      if (fn) fn(this.ctx, this._volume);
    } catch {
      /* swallow – audio is non‑critical */
    }
  }

  // Convenient direct methods
  click(): void { this.play('click'); }
  success(): void { this.play('success'); }
  error(): void { this.play('error'); }
  hover(): void { this.play('hover'); }
  navigate(): void { this.play('navigate'); }
  toggle(): void { this.play('toggle'); }
  download(): void { this.play('download'); }
  complete(): void { this.play('complete'); }
  delete(): void { this.play('delete'); }
  scan(): void { this.play('scan'); }

  /* ── internals ──────────────────────────────────────── */

  private prefersReducedMotion(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private ensureContext(): void {
    if (this.ctx) return;
    if (typeof window === 'undefined') return;
    this.ctx = new AudioContext();
  }

  /* ── helpers ────────────────────────────────────────── */

  /** Create a gain node with a fast attack / release envelope. */
  private static env(
    ctx: AudioContext,
    peak: number,
    attack: number,
    hold: number,
    release: number,
  ): GainNode {
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.setValueAtTime(peak, t + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.001, t + attack + hold + release);
    g.connect(ctx.destination);
    return g;
  }

  /** Play a single tone through an envelope. */
  private static tone(
    ctx: AudioContext,
    freq: number,
    type: OscillatorType,
    vol: number,
    attack: number,
    hold: number,
    release: number,
    startOffset = 0,
  ): void {
    const g = SoundManager.env(ctx, vol, attack, hold, release);
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.connect(g);
    osc.start(ctx.currentTime + startOffset);
    osc.stop(ctx.currentTime + startOffset + attack + hold + release + 0.01);
  }

  /* ── sound definitions ──────────────────────────────── */

  private sounds: Record<SoundName, (ctx: AudioContext, vol: number) => void> = {
    /**
     * click – very soft tick.
     * Short sine blip at ~1200 Hz, 50 ms total.
     */
    click: (ctx, vol) => {
      const peak = vol * 0.12;
      const g = ctx.createGain();
      const t = ctx.currentTime;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      g.connect(ctx.destination);

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, t);
      osc.frequency.exponentialRampToValueAtTime(800, t + 0.05);
      osc.connect(g);
      osc.start(t);
      osc.stop(t + 0.05);
    },

    /**
     * success – two ascending notes (soft chime).
     */
    success: (ctx, vol) => {
      const peak = vol * 0.1;
      SoundManager.tone(ctx, 660, 'sine', peak, 0.005, 0.04, 0.08, 0);
      SoundManager.tone(ctx, 880, 'sine', peak, 0.005, 0.04, 0.10, 0.07);
    },

    /**
     * error – soft low tone.
     */
    error: (ctx, vol) => {
      const peak = vol * 0.1;
      const g = ctx.createGain();
      const t = ctx.currentTime;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      g.connect(ctx.destination);

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(280, t);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.18);
      osc.connect(g);
      osc.start(t);
      osc.stop(t + 0.2);
    },

    /**
     * hover – extremely subtle tick (barely audible).
     */
    hover: (ctx, vol) => {
      const peak = vol * 0.04;
      const g = ctx.createGain();
      const t = ctx.currentTime;
      g.gain.setValueAtTime(peak, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
      g.connect(ctx.destination);

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, t);
      osc.connect(g);
      osc.start(t);
      osc.stop(t + 0.03);
    },

    /**
     * navigate – soft whoosh (filtered noise burst).
     */
    navigate: (ctx, vol) => {
      const peak = vol * 0.06;
      const duration = 0.12;
      const t = ctx.currentTime;

      // White noise via buffer
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.5;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      // Bandpass to shape the whoosh
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1000, t);
      filter.frequency.exponentialRampToValueAtTime(3000, t + duration * 0.4);
      filter.frequency.exponentialRampToValueAtTime(600, t + duration);
      filter.Q.setValueAtTime(1.5, t);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      g.connect(ctx.destination);

      noise.connect(filter);
      filter.connect(g);
      noise.start(t);
      noise.stop(t + duration);
    },

    /**
     * toggle – soft switch click.
     */
    toggle: (ctx, vol) => {
      const peak = vol * 0.1;
      const t = ctx.currentTime;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      g.connect(ctx.destination);

      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1000, t);
      osc.frequency.exponentialRampToValueAtTime(600, t + 0.06);
      osc.connect(g);
      osc.start(t);
      osc.stop(t + 0.07);
    },

    /**
     * download – subtle progress blip.
     */
    download: (ctx, vol) => {
      const peak = vol * 0.07;
      const t = ctx.currentTime;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.005);
      g.gain.setValueAtTime(peak, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      g.connect(ctx.destination);

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, t);
      osc.frequency.linearRampToValueAtTime(700, t + 0.1);
      osc.connect(g);
      osc.start(t);
      osc.stop(t + 0.11);
    },

    /**
     * complete – short 3‑note ascending fanfare.
     */
    complete: (ctx, vol) => {
      const peak = vol * 0.09;
      SoundManager.tone(ctx, 523, 'sine', peak, 0.005, 0.04, 0.06, 0);      // C5
      SoundManager.tone(ctx, 659, 'sine', peak, 0.005, 0.04, 0.06, 0.065);  // E5
      SoundManager.tone(ctx, 784, 'sine', peak * 1.1, 0.005, 0.06, 0.10, 0.13); // G5
    },

    /**
     * delete – soft descending tone.
     */
    delete: (ctx, vol) => {
      const peak = vol * 0.09;
      const t = ctx.currentTime;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      g.connect(ctx.destination);

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.15);
      osc.connect(g);
      osc.start(t);
      osc.stop(t + 0.16);
    },

    /**
     * scan – soft radar‑like ping.
     */
    scan: (ctx, vol) => {
      const peak = vol * 0.08;
      const t = ctx.currentTime;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      g.connect(ctx.destination);

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, t);
      osc.frequency.exponentialRampToValueAtTime(1200, t + 0.2);
      osc.connect(g);
      osc.start(t);
      osc.stop(t + 0.21);
    },
  };
}

/** Singleton – import and use everywhere. */
export const sfx = new SoundManager();
export type { SoundName };
