class SoundManager {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, gainVal: number = 0.05) {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Ignore audio failure
    }
  }

  click() {
    this.playTone(800, 'sine', 0.04, 0.03);
  }

  toggle() {
    this.playTone(600, 'triangle', 0.05, 0.04);
  }

  navigate() {
    this.playTone(500, 'sine', 0.08, 0.03);
  }

  scan() {
    this.playTone(400, 'sawtooth', 0.1, 0.02);
  }

  success() {
    this.playTone(880, 'sine', 0.12, 0.05);
    setTimeout(() => this.playTone(1174, 'sine', 0.15, 0.05), 100);
  }

  complete() {
    this.playTone(523.25, 'triangle', 0.1, 0.05);
    setTimeout(() => this.playTone(659.25, 'triangle', 0.1, 0.05), 100);
    setTimeout(() => this.playTone(783.99, 'triangle', 0.2, 0.05), 200);
  }

  error() {
    this.playTone(220, 'sawtooth', 0.18, 0.06);
    setTimeout(() => this.playTone(180, 'sawtooth', 0.2, 0.06), 120);
  }

  delete() {
    this.playTone(320, 'square', 0.08, 0.03);
  }
}

export const sfx = new SoundManager();
