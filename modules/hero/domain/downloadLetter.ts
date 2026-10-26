import type { LetterContent } from '@/types/letter';

// Descarga la carta (o poema) como imagen PNG o como página HTML, con un diseño
// sencillo de papel. Todo se genera en el navegador: sin librerías ni servidor.
// El PNG se dibuja en un <canvas> con las mismas fuentes de la página.

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
  triggerDownload(blob, `${fileBaseName(letter)}.png`);
}

// Página HTML independiente con la carta: se abre en cualquier navegador, sin conexión
// usa fuentes del sistema y con conexión las mismas de Google Fonts que el sitio.
export function downloadLetterHtml(letter: LetterContent): void {
  const isPoem = letter.mode === 'poem';
  const blocks = letter.body.split(/\n\s*\n/).filter((b) => b.trim().length > 0);
  const body = blocks
    .map((block) =>
      isPoem
        ? `<p class="stanza">${block
            .split('\n')
            .filter((v) => v.trim())
            .map((v) => escapeHtml(v.trim()))
            .join('<br>')}</p>`
        : `<p>${escapeHtml(block.replace(/\n/g, ' '))}</p>`
    )
    .join('\n      ');
  const title = isPoem ? 'Un poema para Adi' : letter.mode === 'medal' ? 'Un reconocimiento de orgullo para Adi' : 'Una carta para Adi';

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,700;1,400;1,500&family=Playfair+Display:ital,wght@1,600&family=Alex+Brush&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 32px 16px; background: #efe6d2; color: ${COLORS.ink};
      font-family: "Cormorant Garamond", Georgia, serif; font-size: 1.25rem; line-height: 1.6; }
    main { max-width: 680px; margin: 0 auto; padding: clamp(28px, 7vw, 64px); background: ${COLORS.paper};
      border: 1px solid ${COLORS.border}; }
    h1 { margin: 0 0 1.4em; font: italic 600 clamp(1.8rem, 5vw, 2.4rem)/1.2 "Playfair Display", Georgia, serif;
      color: ${COLORS.accent}; ${isPoem ? 'text-align: center;' : ''} }
    p { margin: 0 0 1.1em; }
    .stanza { text-align: center; font-style: italic; }
    .question { margin: 2em 0; text-align: center; font: italic 600 1.5rem/1.3 "Playfair Display", Georgia, serif;
      color: ${COLORS.accent}; }
    .ps { font-style: italic; font-size: 1.05rem; color: ${COLORS.soft}; }
    .ps strong { font-style: normal; }
    .sign { margin-top: 2.5em; text-align: right; color: ${COLORS.soft}; font-style: italic; }
    .sign span { display: block; font: 400 3rem/1.1 "Alex Brush", cursive; font-style: normal; color: ${COLORS.accent}; }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(letter.greeting)}</h1>
    <article>
      ${body}
    </article>
    ${letter.question ? `<p class="question">${escapeHtml(letter.question)}</p>` : ''}
    ${letter.psText ? `<p class="ps"><strong>${escapeHtml(letter.psLabel)}</strong> ${escapeHtml(letter.psText)}</p>` : ''}
    <p class="sign">${escapeHtml(letter.signIntro)}<span>${escapeHtml(letter.signName)}</span></p>
  </main>
</body>
</html>
`;
  triggerDownload(new Blob([html], { type: 'text/html;charset=utf-8' }), `${fileBaseName(letter)}.html`);
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fileBaseName(letter: LetterContent): string {
  if (letter.mode === 'poem') return 'poema-para-adi';
  if (letter.mode === 'medal') return 'reconocimiento-para-adi';
  return 'carta-para-adi';
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
