import type { LetterContent } from '@/types/letter';
import { deleteCloudLetter, fetchCloudLetter, saveCloudLetter } from './letterApiClient';
import { DEFAULT_LETTER, cacheLetter, getLocalLetter, saveLocalLetter, resetLocalLetter } from './letterRepository';

export interface LoadLetterResult {
  letter: LetterContent;
  connected: boolean;
}

// Supabase es la fuente de verdad cuando esta conectado; si no, usamos el
// respaldo local (mismo comportamiento que antes de tener nube).
export async function loadLetter(): Promise<LoadLetterResult> {
  const cloud = await fetchCloudLetter();
  if (cloud.connected) {
    const letter = cloud.letter ? { ...DEFAULT_LETTER, ...cloud.letter } : DEFAULT_LETTER;
    cacheLetter(letter);
    return { letter, connected: true };
  }
  return { letter: getLocalLetter(), connected: false };
}

export async function persistLetter(letter: LetterContent): Promise<void> {
  const ok = await saveCloudLetter(letter);
  if (!ok) {
    saveLocalLetter(letter);
    return;
  }
  cacheLetter(letter);
  window.dispatchEvent(new CustomEvent('letter_updated', { detail: letter }));
}

export async function resetLetterEverywhere(): Promise<LetterContent> {
  const ok = await deleteCloudLetter();
  if (!ok) {
    return resetLocalLetter();
  }
  cacheLetter(DEFAULT_LETTER);
  window.dispatchEvent(new CustomEvent('letter_updated', { detail: DEFAULT_LETTER }));
  return DEFAULT_LETTER;
}
