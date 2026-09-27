// ==============================================================================
// SINTETIZADOR DE SONIDOS ROMÁNTICOS (Web Audio API)
// Sin dependencias externas ni archivos pesados de audio
// ==============================================================================

class SoundEffects {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.ambientPlaying = false;
    this.ambientInterval = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Chime mágico para abrir sobres o fotos
  playSparkle() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C5, E5, G5, C6, E6
    const now = this.ctx.currentTime;

    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.07);

      gain.gain.setValueAtTime(0.09, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.65);
    });
  }

  // Melodía triunfal y dulce cuando acepta una invitación
  playCelebration() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    // Progresión romántica: F, A, C, E, G, C(alto)
    const melody = [
      { f: 349.23, t: 0.00, d: 0.25 }, // F4
      { f: 440.00, t: 0.15, d: 0.25 }, // A4
      { f: 523.25, t: 0.30, d: 0.30 }, // C5
      { f: 659.25, t: 0.45, d: 0.35 }, // E5
      { f: 783.99, t: 0.60, d: 0.40 }, // G5
      { f: 1046.5, t: 0.80, d: 0.80 }  // C6 sostenido
    ];

    const now = this.ctx.currentTime;

    melody.forEach(({ f, t, d }) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + t);

      gain.gain.setValueAtTime(0.15, now + t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + t + d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + t);
      osc.stop(now + t + d + 0.05);
    });
  }

  // Pequeño pop dulce para botones
  playPop() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  // Sonido suave de latido
  playHeartbeat() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [0, 0.22].forEach(delay => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(75, now + delay);
      osc.frequency.exponentialRampToValueAtTime(45, now + delay + 0.15);

      gain.gain.setValueAtTime(0.12, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + 0.2);
    });
  }

  toggleMute() {
    this.muted = !this.muted;
    return !this.muted;
  }
}

export const sounds = new SoundEffects();
