// Reconoce de qué red es un link para mostrar "Ver en TikTok", "Ver en YouTube", etc.
const PLATFORMS: [RegExp, string][] = [
  [/(^|\.)tiktok\.com$/, 'TikTok'],
  [/(^|\.)(instagram\.com|instagr\.am)$/, 'Instagram'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'YouTube'],
  [/(^|\.)(facebook\.com|fb\.com|fb\.watch)$/, 'Facebook'],
  [/(^|\.)(x\.com|twitter\.com)$/, 'X'],
  [/(^|\.)(pinterest\.[a-z.]+|pin\.it)$/, 'Pinterest'],
  [/(^|\.)threads\.(net|com)$/, 'Threads'],
  [/(^|\.)spotify\.com$/, 'Spotify'],
  [/(^|\.)reddit\.com$/, 'Reddit'],
  [/(^|\.)(wa\.me|whatsapp\.com)$/, 'WhatsApp'],
  [/(^|\.)(maps\.app\.goo\.gl|maps\.google\.[a-z.]+)$/, 'Google Maps'],
];

export function isSafeUrl(url: string | undefined): boolean {
  return /^https?:\/\//i.test((url || '').trim());
}

// "www.tiktok.com/..." → "https://www.tiktok.com/..."; descarta esquemas raros (javascript:, data:...)
export function normalizeUrl(url: string | undefined): string {
  const trimmed = (url || '').trim();
  if (!trimmed) return '';
  if (isSafeUrl(trimmed)) return trimmed;
  if (/^[\w-]+:/.test(trimmed)) return '';
  return `https://${trimmed.replace(/^\/+/, '')}`;
}

export function isImageUrl(url: string | undefined): boolean {
  return isSafeUrl(url) && /\.(jpe?g|png|webp|gif|avif)([?#]|$)/i.test(url as string);
}

export function linkLabel(link: string): string {
  try {
    const { hostname, pathname } = new URL(link);
    const host = hostname.toLowerCase();
    if (/(^|\.)google\.[a-z.]+$/.test(host) && pathname.startsWith('/maps')) return 'Ver en Google Maps';
    const match = PLATFORMS.find(([re]) => re.test(host));
    if (match) return `Ver en ${match[1]}`;
  } catch {
    // link sin formato de URL: etiqueta genérica
  }
  return 'Ver enlace';
}
