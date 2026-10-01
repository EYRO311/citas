// ==============================================================================
// ANIMACIÓN DE GLOBOS FLOTANTES Y ROMÁNTICOS EN CANVAS 2D 🎈✨
// Globos clásicos y de corazón con nudos, reflejos de luz y cordeles ondulantes
// Optimizado a 60fps en móviles y pantallas de escritorio
// ==============================================================================

interface Balloon {
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  speedY: number;
  swaySpeed: number;
  swayAmp: number;
  swayPhase: number;
  tilt: number;
  color: string;
  opacity: number;
  stringLength: number;
  stringPhase: number;
  stringWaveSpeed: number;
  isHeart: boolean;
}

interface BurstBalloon extends Balloon {
  vx: number;
  vy: number;
  life: number;
}

const AMBIENT_COLORS = [
  '#60A5FA', '#38BDF8', '#93C5FD',
  '#F43F5E', '#FB7185', '#FBBF24',
  '#FDE68A', '#C084FC', '#FFFFFF', '#E0F2FE',
];

const BURST_COLORS = [
  '#60A5FA', '#38BDF8', '#93C5FD',
  '#F43F5E', '#FB7185', '#FBBF24',
  '#FDE68A', '#C084FC', '#FFFFFF',
];

export class PetalsEngine {
  canvas: HTMLCanvasElement | null;
  ctx: CanvasRenderingContext2D | null = null;
  balloons: Balloon[] = [];
  burstBalloons: BurstBalloon[] = [];
  isActive = true;
  mouse = { x: -1000, y: -1000 };
  private rafId: number | null = null;
  private onResize = () => this.resize();
  private onMouseMove = (e: MouseEvent) => {
    this.mouse.x = e.clientX;
    this.mouse.y = e.clientY;
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.init();
  }

  init() {
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', this.onResize);
    window.addEventListener('mousemove', this.onMouseMove, { passive: true });

    const count = window.innerWidth < 640 ? 18 : 28;
    this.balloons = Array.from({ length: count }, () => this.createBalloon(AMBIENT_COLORS, true));

    this.rafId = requestAnimationFrame(() => this.animate());
  }

  createBalloon(colors: string[], randomizeY = false): Balloon {
    const width = this.canvas ? this.canvas.width : window.innerWidth;
    const height = this.canvas ? this.canvas.height : window.innerHeight;

    const depth = Math.random() * 0.5 + 0.5;
    const radiusX = (Math.random() * 8 + 14) * depth;
    const radiusY = radiusX * (Math.random() * 0.2 + 1.25);

    return {
      x: Math.random() * width,
      y: randomizeY ? Math.random() * height : height + radiusY + Math.random() * 100,
      radiusX,
      radiusY,
      speedY: (Math.random() * 0.6 + 0.5) * depth,
      swaySpeed: Math.random() * 0.02 + 0.012,
      swayAmp: Math.random() * 1.5 + 0.8,
      swayPhase: Math.random() * Math.PI * 2,
      tilt: 0,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: Math.random() * 0.35 + 0.45 * depth,
      stringLength: (Math.random() * 20 + 35) * depth,
      stringPhase: Math.random() * Math.PI * 2,
      stringWaveSpeed: Math.random() * 0.04 + 0.03,
      isHeart: Math.random() > 0.72,
    };
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  animate() {
    if (!this.ctx || !this.canvas || !this.isActive) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = 0; i < this.balloons.length; i++) {
      const b = this.balloons[i];

      b.y -= b.speedY;
      b.swayPhase += b.swaySpeed;
      b.stringPhase += b.stringWaveSpeed;

      const swayOffset = Math.sin(b.swayPhase) * b.swayAmp;
      b.x += swayOffset;
      b.tilt = (swayOffset / b.swayAmp) * 0.12;

      const dx = b.x - this.mouse.x;
      const dy = b.y - this.mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 90 && dist > 0) {
        const force = (90 - dist) / 90;
        b.x += (dx / dist) * force * 2.2;
        b.y += (dy / dist) * force * 1.5;
      }

      if (b.y < -b.radiusY - b.stringLength - 30) {
        Object.assign(b, this.createBalloon(AMBIENT_COLORS, false));
      }
      if (b.x < -40) b.x = this.canvas.width + 30;
      if (b.x > this.canvas.width + 40) b.x = -30;

      this.drawBalloon(b);
    }

    for (let i = this.burstBalloons.length - 1; i >= 0; i--) {
      const bb = this.burstBalloons[i];
      bb.x += bb.vx;
      bb.y += bb.vy;

      bb.vx *= 0.985;
      bb.vy -= 0.04;
      if (bb.vy < -3.5) bb.vy = -3.5;

      bb.stringPhase += 0.06;
      bb.swayPhase += 0.04;
      bb.tilt = Math.sin(bb.swayPhase) * 0.18;
      bb.life -= 0.005;

      if (bb.life <= 0 || bb.y < -bb.radiusY - bb.stringLength - 50) {
        this.burstBalloons.splice(i, 1);
        continue;
      }

      const originalOpacity = bb.opacity;
      bb.opacity = Math.min(originalOpacity, bb.life);
      this.drawBalloon(bb);
      bb.opacity = originalOpacity;
    }

    this.rafId = requestAnimationFrame(() => this.animate());
  }

  drawBalloon(b: Balloon) {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.tilt);
    ctx.globalAlpha = Math.max(0, Math.min(1, b.opacity));

    const rX = b.radiusX;
    const rY = b.radiusY;

    if (b.isHeart) {
      const s = rX * 1.15;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.45);
      ctx.bezierCurveTo(-s * 1.15, -s * 0.4, -s * 0.95, -s * 1.3, 0, -s * 0.58);
      ctx.bezierCurveTo(s * 0.95, -s * 1.3, s * 1.15, -s * 0.4, 0, s * 0.45);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
      ctx.beginPath();
      ctx.ellipse(-s * 0.38, -s * 0.58, s * 0.24, s * 0.14, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.moveTo(-3, s * 0.45);
      ctx.lineTo(3, s * 0.45);
      ctx.lineTo(0, s * 0.45 + 5);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.45 + 5);
      const wave = Math.sin(b.stringPhase) * 6;
      ctx.bezierCurveTo(wave, s * 0.45 + 16, -wave, s * 0.45 + 32, wave * 0.4, s * 0.45 + b.stringLength);
      ctx.stroke();
    } else {
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.moveTo(0, -rY);
      ctx.bezierCurveTo(rX * 1.18, -rY, rX * 1.05, rY * 0.55, 0, rY);
      ctx.bezierCurveTo(-rX * 1.05, rY * 0.55, -rX * 1.18, -rY, 0, -rY);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.ellipse(-rX * 0.4, -rY * 0.35, rX * 0.24, rY * 0.45, -Math.PI / 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.beginPath();
      ctx.arc(-rX * 0.38, -rY * 0.56, Math.max(1.8, rX * 0.09), 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.moveTo(-3.5, rY);
      ctx.lineTo(3.5, rY);
      ctx.lineTo(0, rY + 5);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(0, rY + 5);
      const wave = Math.sin(b.stringPhase) * 6;
      ctx.bezierCurveTo(wave, rY + 16, -wave, rY + 32, wave * 0.4, rY + b.stringLength);
      ctx.stroke();
    }

    ctx.restore();
  }

  triggerBurst(originX?: number, originY?: number, count = 28) {
    const x = originX !== undefined ? originX : window.innerWidth / 2;
    const y = originY !== undefined ? originY : window.innerHeight / 2;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = Math.random() * 5 + 2.5;
      const depth = Math.random() * 0.4 + 0.6;
      const radiusX = (Math.random() * 7 + 13) * depth;
      const radiusY = radiusX * 1.3;

      this.burstBalloons.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed * 0.8,
        vy: -Math.abs(Math.sin(angle) * speed) - (Math.random() * 2 + 1),
        radiusX,
        radiusY,
        speedY: 0,
        swaySpeed: 0,
        swayAmp: 0,
        color: BURST_COLORS[Math.floor(Math.random() * BURST_COLORS.length)],
        opacity: Math.random() * 0.25 + 0.65,
        life: 1.0,
        swayPhase: Math.random() * Math.PI * 2,
        stringPhase: Math.random() * Math.PI * 2,
        stringWaveSpeed: 0,
        stringLength: (Math.random() * 18 + 32) * depth,
        tilt: 0,
        isHeart: Math.random() > 0.6,
      });
    }
  }

  destroy() {
    this.isActive = false;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('mousemove', this.onMouseMove);
  }
}
