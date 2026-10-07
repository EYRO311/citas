import type { LetterContent } from '@/types/letter';

const STORAGE_KEY = 'propuesta_letter';

export const DEFAULT_LETTER: LetterContent = {
  peekSalutation: 'Para mi niña hermosa, Adi',
  greeting: 'Para mi hermosa Adi,',
  body: `Hoy quise crear un rincón que fuera tan especial y luminoso como tú. Elegí los colores de estas flores al óleo porque tienen esa misma calidez y magia con la que llegas a iluminar mis días. Cada instante a tu lado se convierte en mi recuerdo favorito.

Tengo preparadas dos citas para nosotros dos. Dos momentos pensados para detener el tiempo, mirarte a los ojos, reírnos de todo y seguir escribiendo nuestra historia paso a paso. Quiero que cada una de nuestras salidas quede guardada para siempre en nuestro álbum.`,
  question: '¿Me concederías el honor más bonito de acompañarme a estas dos aventuras?',
  psLabel: 'P.D.',
  psText: 'Cada flor de este lienzo guarda una razón por la que eres y siempre serás mi persona favorita en el universo entero. 🌻',
  signIntro: 'Siempre tuyo,',
  signName: 'Eyro',
};

export function getLetter(): LetterContent {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...DEFAULT_LETTER, ...JSON.parse(saved) } as LetterContent;
  } catch {
    // ignore parse/storage errors, fall back to defaults
  }
  return DEFAULT_LETTER;
}

export function saveLetter(letter: LetterContent): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(letter));
    window.dispatchEvent(new CustomEvent('letter_updated', { detail: letter }));
  } catch {
    // storage unavailable (private mode, quota, etc.) — silently ignore like events repo
  }
}

export function resetLetter(): LetterContent {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('letter_updated', { detail: DEFAULT_LETTER }));
  } catch {
    // ignore
  }
  return DEFAULT_LETTER;
}
