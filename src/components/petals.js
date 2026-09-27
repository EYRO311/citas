// ==============================================================================
// ANIMACIÓN DE GLOBOS FLOTANTES Y ROMÁNTICOS EN CANVAS 2D 🎈✨
// Globos clásicos y de corazón con nudos, reflejos de luz y cordeles ondulantes
// Optimizado a 60fps en móviles y pantallas de escritorio
// ==============================================================================

export class PetalsCanvas {
  constructor(canvasId = 'petals-canvas') {
    this.canvas = document.getElementById(canvasId);
    this.ctx = null;
    this.balloons = [];
    this.burstBalloons = [];
    this.isActive = true;
    this.mouse = { x: -1000, y: -1000 };
    this.init();
  }

  init() {
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Interacción suave con el cursor o toque
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    }, { passive: true });

    // Paleta de colores armoniosa: azules cielo, dorados cálidos, rosas pastel y blanco perla
    const balloonColors = [
      '#60A5FA', // Azul cielo radiante
      '#38BDF8', // Celeste luminoso
      '#93C5FD', // Azul pastel suave
      '#F43F5E', // Rosa romántico
      '#FB7185', // Rosa suave
      '#FBBF24', // Dorado cálido
      '#FDE68A', // Oro pastel
      '#C084FC', // Lila etéreo
      '#FFFFFF', // Blanco perlado
      '#E0F2FE'  // Brisa celeste
    ];

    // 28 globos ambientales flotando suavemente hacia el cielo
    const count = window.innerWidth < 640 ? 18 : 28;
    this.balloons = Array.from({ length: count }, () => this.createBalloon(balloonColors, true));

    requestAnimationFrame(() => this.animate());
  }

  createBalloon(colors, randomizeY = false) {
    const width = this.canvas ? this.canvas.width : window.innerWidth;
    const height = this.canvas ? this.canvas.height : window.innerHeight;

    // Profundidad visual: algunos globos más lejanos y pequeños, otros más cercanos
    const depth = Math.random() * 0.5 + 0.5; // 0.5 a 1.0
    const radiusX = (Math.random() * 8 + 14) * depth;
    const radiusY = radiusX * (Math.random() * 0.2 + 1.25); // Relación alargada natural

    return {
      x: Math.random() * width,
      y: randomizeY ? Math.random() * height : height + radiusY + Math.random() * 100,
      radiusX,
      radiusY,
      speedY: (Math.random() * 0.6 + 0.5) * depth, // Flotación hacia arriba (helio)
      swaySpeed: Math.random() * 0.02 + 0.012,
      swayAmp: Math.random() * 1.5 + 0.8,
      swayPhase: Math.random() * Math.PI * 2,
      tilt: 0,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: Math.random() * 0.35 + 0.45 * depth,
      stringLength: (Math.random() * 20 + 35) * depth,
      stringPhase: Math.random() * Math.PI * 2,
      stringWaveSpeed: Math.random() * 0.04 + 0.03,
      isHeart: Math.random() > 0.72 // ~28% de globos son con forma de corazón romántico
    };
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  animate() {
    if (!this.ctx || !this.isActive) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const colors = [
      '#60A5FA', '#38BDF8', '#93C5FD',
      '#F43F5E', '#FB7185', '#FBBF24',
      '#FDE68A', '#C084FC', '#FFFFFF'
    ];

    // 1. DIBUJAR Y MOVER GLOBOS AMBIENTALES
    for (let i = 0; i < this.balloons.length; i++) {
      const b = this.balloons[i];

      // Ascenso hacia arriba
      b.y -= b.speedY;
      b.swayPhase += b.swaySpeed;
      b.stringPhase += b.stringWaveSpeed;

      // Movimiento oscilante natural de lado a lado
      const swayOffset = Math.sin(b.swayPhase) * b.swayAmp;
      b.x += swayOffset;
      b.tilt = (swayOffset / b.swayAmp) * 0.12;

      // Interacción sutil con el cursor (los globos se apartan delicadamente)
      const dx = b.x - this.mouse.x;
      const dy = b.y - this.mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 90 && dist > 0) {
        const force = (90 - dist) / 90;
        b.x += (dx / dist) * force * 2.2;
        b.y += (dy / dist) * force * 1.5;
      }

      // Reaparecer en la parte inferior cuando salen por arriba de la pantalla
      if (b.y < -b.radiusY - b.stringLength - 30) {
        Object.assign(b, this.createBalloon(colors, false));
      }
      if (b.x < -40) b.x = this.canvas.width + 30;
      if (b.x > this.canvas.width + 40) b.x = -30;

      this.drawBalloon(b);
    }

    // 2. DIBUJAR Y ANIMAR GLOBOS DE CELEBRACIÓN / EXPLOSIÓN FESTIVA
    for (let i = this.burstBalloons.length - 1; i >= 0; i--) {
      const bb = this.burstBalloons[i];
      bb.x += bb.vx;
      bb.y += bb.vy;

      // Frenado horizontal por fricción del aire
      bb.vx *= 0.985;
      // Tendencia constante a subir hacia el cielo (helio)
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

    requestAnimationFrame(() => this.animate());
  }

  // Dibuja un globo con su forma esférica / corazón, nudo, brillo 3D y cordel
  drawBalloon(b) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.tilt);
    ctx.globalAlpha = Math.max(0, Math.min(1, b.opacity));

    const rX = b.radiusX;
    const rY = b.radiusY;

    if (b.isHeart) {
      // 🎈 GLOBO CON FORMA DE CORAZÓN
      const s = rX * 1.15;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.45);
      ctx.bezierCurveTo(-s * 1.15, -s * 0.4, -s * 0.95, -s * 1.3, 0, -s * 0.58);
      ctx.bezierCurveTo(s * 0.95, -s * 1.3, s * 1.15, -s * 0.4, 0, s * 0.45);
      ctx.fill();

      // Brillo 3D curvado en el lóbulo superior izquierdo
      ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
      ctx.beginPath();
      ctx.ellipse(-s * 0.38, -s * 0.58, s * 0.24, s * 0.14, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();

      // Nudo inferior del globo
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.moveTo(-3, s * 0.45);
      ctx.lineTo(3, s * 0.45);
      ctx.lineTo(0, s * 0.45 + 5);
      ctx.closePath();
      ctx.fill();

      // Cordel ondulante
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.45 + 5);
      const wave = Math.sin(b.stringPhase) * 6;
      ctx.bezierCurveTo(
        wave, s * 0.45 + 16,
        -wave, s * 0.45 + 32,
        wave * 0.4, s * 0.45 + b.stringLength
      );
      ctx.stroke();

    } else {
      // 🎈 GLOBO CLÁSICO OVALADO (Afinado abajo hacia el nudo)
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.moveTo(0, -rY);
      // Lado derecho
      ctx.bezierCurveTo(rX * 1.18, -rY, rX * 1.05, rY * 0.55, 0, rY);
      // Lado izquierdo
      ctx.bezierCurveTo(-rX * 1.05, rY * 0.55, -rX * 1.18, -rY, 0, -rY);
      ctx.fill();

      // Brillo principal especular (reflejo de luz 3D)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.ellipse(-rX * 0.4, -rY * 0.35, rX * 0.24, rY * 0.45, -Math.PI / 7, 0, Math.PI * 2);
      ctx.fill();

      // Pequeño destello secundario arriba a la izquierda
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.beginPath();
      ctx.arc(-rX * 0.38, -rY * 0.56, Math.max(1.8, rX * 0.09), 0, Math.PI * 2);
      ctx.fill();

      // Nudo triangular en la base del globo
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.moveTo(-3.5, rY);
      ctx.lineTo(3.5, rY);
      ctx.lineTo(0, rY + 5);
      ctx.closePath();
      ctx.fill();

      // Cordel ondulante que cuelga y ondea con la brisa
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(0, rY + 5);
      const wave = Math.sin(b.stringPhase) * 6;
      ctx.bezierCurveTo(
        wave, rY + 16,
        -wave, rY + 32,
        wave * 0.4, rY + b.stringLength
      );
      ctx.stroke();
    }

    ctx.restore();
  }

  // Suelta una oleada festiva de globos desde las coordenadas dadas
  triggerBurst(originX, originY, count = 28) {
    const x = originX !== undefined ? originX : window.innerWidth / 2;
    const y = originY !== undefined ? originY : window.innerHeight / 2;
    const colors = [
      '#60A5FA', '#38BDF8', '#93C5FD',
      '#F43F5E', '#FB7185', '#FBBF24',
      '#FDE68A', '#C084FC', '#FFFFFF'
    ];

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
        vy: -Math.abs(Math.sin(angle) * speed) - (Math.random() * 2 + 1), // Impulso inicial hacia arriba
        radiusX,
        radiusY,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: Math.random() * 0.25 + 0.65,
        life: 1.0,
        swayPhase: Math.random() * Math.PI * 2,
        stringPhase: Math.random() * Math.PI * 2,
        stringLength: (Math.random() * 18 + 32) * depth,
        tilt: 0,
        isHeart: Math.random() > 0.6 // 40% de globos corazón en la celebración
      });
    }
  }
}

// Exportar también como BalloonsCanvas para claridad semántica
export const BalloonsCanvas = PetalsCanvas;
