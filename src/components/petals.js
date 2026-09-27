// ==============================================================================
// ANIMACIÓN DE PÉTALOS DE FLORES Y CORAZONES FLOTANTES (CANVAS 2D)
// Optimizado para 60fps en móviles y escritorio
// ==============================================================================

export class PetalsCanvas {
  constructor(canvasId = 'petals-canvas') {
    this.canvas = document.getElementById(canvasId);
    this.ctx = null;
    this.petals = [];
    this.confettiParticles = [];
    this.isActive = true;
    this.init();
  }

  init() {
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Paleta de pétalos armónica en tonos de blanco, celeste, oro suave y cosmos
    const petalColors = [
      '#FFFFFF',
      '#F8FAFC',
      '#BAE6FD',
      '#E0F2FE',
      '#FEF08A',
      '#FED7AA',
      '#FECDD3'
    ];

    // 36 pétalos ambientales flotando con elegancia
    this.petals = Array.from({ length: 36 }, () => ({
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      size: Math.random() * 8 + 5,
      speedY: Math.random() * 0.9 + 0.5,
      speedX: (Math.random() - 0.5) * 0.7,
      angle: Math.random() * 360,
      angularSpeed: (Math.random() - 0.5) * 1.4,
      color: petalColors[Math.floor(Math.random() * petalColors.length)],
      opacity: Math.random() * 0.4 + 0.35,
      wobbleSpeed: Math.random() * 0.02 + 0.01
    }));

    requestAnimationFrame(() => this.animate());
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  animate() {
    if (!this.ctx || !this.isActive) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 1. Dibujar y mover pétalos ambientales
    for (let i = 0; i < this.petals.length; i++) {
      const p = this.petals[i];
      p.y += p.speedY;
      p.x += Math.sin(p.y * p.wobbleSpeed) * 0.9 + p.speedX;
      p.angle += p.angularSpeed;

      // Reaparecer arriba al salir por la parte inferior
      if (p.y > this.canvas.height + 25) {
        p.y = -25;
        p.x = Math.random() * this.canvas.width;
      }
      if (p.x < -30) p.x = this.canvas.width + 20;
      if (p.x > this.canvas.width + 30) p.x = -20;

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.angle * Math.PI) / 180);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.opacity;

      // Pétalo ovalado elegante
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, p.size, p.size * 0.48, 0, 0, Math.PI * 2);
      this.ctx.fill();

      // Sombra central suave del nervio del pétalo
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, p.size * 0.6, p.size * 0.15, 0, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.restore();
    }

    // 2. Dibujar y animar partículas de confeti / corazones por interacción
    for (let i = this.confettiParticles.length - 1; i >= 0; i--) {
      const cp = this.confettiParticles[i];
      cp.x += cp.vx;
      cp.y += cp.vy;
      cp.vy += 0.22; // Gravedad
      cp.life -= 0.016;
      cp.angle += cp.angularSpeed;

      if (cp.life <= 0) {
        this.confettiParticles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.translate(cp.x, cp.y);
      this.ctx.rotate((cp.angle * Math.PI) / 180);
      this.ctx.fillStyle = cp.color;
      this.ctx.globalAlpha = Math.max(0, cp.life);

      if (cp.isHeart) {
        // Corazón en Canvas
        const s = cp.size * 0.9;
        this.ctx.beginPath();
        this.ctx.moveTo(0, s * 0.3);
        this.ctx.bezierCurveTo(-s, -s * 0.4, -s * 0.8, -s * 1.2, 0, -s * 0.5);
        this.ctx.bezierCurveTo(s * 0.8, -s * 1.2, s, -s * 0.4, 0, s * 0.3);
        this.ctx.fill();
      } else {
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, cp.size, cp.size * 0.5, 0, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.restore();
    }

    requestAnimationFrame(() => this.animate());
  }

  // Explota una lluvia festiva de pétalos y corazones en las coordenadas dadas
  triggerBurst(originX, originY, count = 35) {
    const x = originX !== undefined ? originX : window.innerWidth / 2;
    const y = originY !== undefined ? originY : window.innerHeight / 2;
    const colors = ['#FFFFFF', '#BAE6FD', '#7DD3FC', '#38BDF8', '#2563EB', '#FECDD3', '#FEF08A'];

    for (let i = 0; i < count; i++) {
      const speed = Math.random() * 9 + 4;
      const angle = Math.random() * Math.PI * 2;
      this.confettiParticles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4,
        size: Math.random() * 8 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1.0,
        angle: Math.random() * 360,
        angularSpeed: (Math.random() - 0.5) * 12,
        isHeart: Math.random() > 0.4
      });
    }
  }
}
