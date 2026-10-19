import type { LetterContent } from '@/types/letter';

// Genera una imagen PNG de la carta (o poema) con un diseño sencillo de papel y la
// descarga. Se dibuja en un <canvas> con las mismas fuentes de la página, así que no
// necesita librerías ni pasar por el servidor.

const WIDTH = 1200;
const MARGIN = 120;
const CONTENT_W = WIDTH - MARGIN * 2;

const COLORS = {
  paper: '#fbf6ea',
  border: '#d9c9a3',
  ink: '#3e2a18',
  soft: '#7a5a3a',
  accent: '#1e3a8a',
};

const FONTS = {
  greeting: 'italic 600 54px "Playfair Display", Georgia, serif',
  body: '400 31px "Cormorant Garamond", Georgia, serif',
  verse: 'italic 500 31px "Cormorant Garamond", Georgia, serif',
  question: 'italic 600 34px "Playfair Display", Georgia, serif',
  psLabel: '700 27px "Cormorant Garamond", Georgia, serif',
  ps: 'italic 400 27px "Cormorant Garamond", Georgia, serif',
  signIntro: 'italic 400 29px "Cormorant Garamond", Georgia, serif',
  signName: '400 72px "Alex Brush", cursive',
};

interface Line {
  text: string;
  font: string;
  color: string;
  align: 'left' | 'center' | 'right';
  y: number;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, font: string, maxWidth: number): string[] {
  ctx.font = font;
  const lines: string[] = [];
  for (const rawLine of text.split('\n')) {
    let current = '';
    for (const word of rawLine.split(/\s+/).filter(Boolean)) {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    lines.push(current);
  }
  return lines;
}

function layout(ctx: CanvasRenderingContext2D, letter: LetterContent): { lines: Line[]; height: number } {
  const isPoem = letter.mode === 'poem';
  const lines: Line[] = [];
  let y = MARGIN;

  const add = (text: string, font: string, color: string, align: Line['align'], lineHeight: number) => {
    for (const l of wrap(ctx, text, font, CONTENT_W)) {
      y += lineHeight;
      lines.push({ text: l, font, color, align, y });
    }
  };

  add(letter.greeting, FONTS.greeting, COLORS.accent, isPoem ? 'center' : 'left', 64);
  y += 46;

  const blocks = letter.body.split(/\n\s*\n/).filter((b) => b.trim().length > 0);
  blocks.forEach((block, i) => {
    if (i > 0) y += 26;
    if (isPoem) {
      block
        .split('\n')
        .filter((v) => v.trim())
        .forEach((verse) => add(verse.trim(), FONTS.verse, COLORS.ink, 'center', 46));
    } else {
      add(block.replace(/\n/g, ' '), FONTS.body, COLORS.ink, 'left', 47);
    }
  });

  if (letter.question) {
    y += 56;
    add(letter.question, FONTS.question, COLORS.accent, 'center', 50);
  }
  if (letter.psText) {
    y += 52;
    add(`${letter.psLabel} ${letter.psText}`.trim(), FONTS.ps, COLORS.soft, 'left', 40);
  }

  y += 70;
  add(letter.signIntro, FONTS.signIntro, COLORS.soft, 'right', 40);
  add(letter.signName, FONTS.signName, COLORS.accent, 'right', 84);

  return { lines, height: y + MARGIN };
}

export async function downloadLetterImage(letter: LetterContent): Promise<void> {
  // Asegura que las fuentes de Google ya estén cargadas antes de dibujar
  try {
    await Promise.all(Object.values(FONTS).map((f) => document.fonts.load(f)));
  } catch {
    // si alguna fuente falla se usa la alternativa del sistema
  }

  const canvas = document.createElement('canvas');
  const measure = canvas.getContext('2d');
  if (!measure) return;
  const { lines, height } = layout(measure, letter);

  const scale = 2; // nitidez en pantallas de alta densidad
  canvas.width = WIDTH * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(scale, scale);

  ctx.fillStyle = COLORS.paper;
  ctx.fillRect(0, 0, WIDTH, height);
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, WIDTH - 80, height - 80);

  ctx.textBaseline = 'alphabetic';
  for (const line of lines) {
    ctx.font = line.font;
    ctx.fillStyle = line.color;
    ctx.textAlign = line.align;
    const x = line.align === 'left' ? MARGIN : line.align === 'right' ? WIDTH - MARGIN : WIDTH / 2;
    ctx.fillText(line.text, x, line.y);
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = letter.mode === 'poem' ? 'poema-para-adi.png' : 'carta-para-adi.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
