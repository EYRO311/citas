import type { LetterContent } from '@/types/letter';

const STORAGE_KEY = 'propuesta_letter';

export const DEFAULT_LETTER: LetterContent = {
  mode: 'letter',
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

export const DEFAULT_POEM: LetterContent = {
  mode: 'poem',
  poemTitle: 'Donde florece tu sonrisa',
  peekSalutation: 'Un poema para mi niña hermosa, Adi',
  greeting: 'Donde florece tu sonrisa',
  body: `Entre millones de caminos y miradas,
hallé en tu risa mi refugio preferido;
un rincón de calma en las mañanas
y el sol más cálido que he conocido.

Eres el girasol que siempre busca el día,
la melodía dulce que calma la tormenta,
ser dos contra el mundo en armonía,
donde cada instante a tu lado cuenta.

Si el tiempo se detuviera en un abrazo,
elegiría quedarme en tu mirar sincero,
caminar contigo paso a paso,
porque es contigo donde florecer quiero.`,
  question: '¿Me regalas tu tiempo y tu risa para escribir juntos nuestras próximas dos historias?',
  psLabel: 'P.D.',
  psText: 'Cada verso nació pensando en la magia que llevas dentro. 🌻',
  signIntro: 'Con todo mi amor,',
  signName: 'Eyro',
};

export const DEFAULT_MEDAL: LetterContent = {
  mode: 'medal',
  medalCaption: 'AllStar Cup',
  peekSalutation: 'Un reconocimiento de orgullo para mi campeona, Adi',
  greeting: '¡Felicidades, campeona! 🏅',
  body: `Adi, de verdad estoy muy orgulloso de que hayas perseguido esta oportunidad en AllStar Cup y de ver todo el resultado de tu esfuerzo hecho realidad arriba de ese escenario.

Cada práctica, cada madrugada y cada intento valieron la pena. Verte brillar ahí es uno de mis recuerdos favoritos.`,
  question: 'Realmente estoy orgulloso de ti, amor. Sigue así, hermosa.',
  psLabel: 'P.D.',
  psText: 'Esta medalla es solo el reflejo de lo grande que eres por dentro. 🌻',
  signIntro: 'Orgulloso siempre de ti,',
  signName: 'Eyro',
};

export function getLocalLetter(): LetterContent {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_LETTER,
        ...parsed,
        mode: parsed.mode || 'letter',
      } as LetterContent;
    }
  } catch {
    // ignore parse/storage errors, fall back to defaults
  }
  return DEFAULT_LETTER;
}

export function cacheLetter(letter: LetterContent): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(letter));
  } catch {
    // storage unavailable
  }
}

export function saveLocalLetter(letter: LetterContent): void {
  cacheLetter(letter);
  try {
    window.dispatchEvent(new CustomEvent('letter_updated', { detail: letter }));
  } catch {
    // ignore
  }
}

export function resetLocalLetter(): LetterContent {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('letter_updated', { detail: DEFAULT_LETTER }));
  } catch {
    // ignore
  }
  return DEFAULT_LETTER;
}
