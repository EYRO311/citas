import { SupabaseClient } from '@supabase/supabase-js';
import type { LetterContent } from '@/types/letter';
import { BUCKET, PREFIX } from './memoriesService';

// ==============================================================================
// Carta para Adi (texto del sobre) en Supabase Storage.
// Se guarda como un unico JSON: propuesta/letter.json.
// Comparte el mismo bucket/prefijo que los recuerdos de la galeria.
// ==============================================================================

const LETTER_PATH = `${PREFIX}/letter.json`;

export async function readLetter(supabase: SupabaseClient): Promise<LetterContent | null> {
  const bucket = supabase.storage.from(BUCKET);
  const { data, error } = await bucket.download(LETTER_PATH);
  if (error) return null;
  try {
    return JSON.parse(await data.text()) as LetterContent;
  } catch {
    return null;
  }
}

export async function writeLetter(supabase: SupabaseClient, letter: LetterContent): Promise<void> {
  const bucket = supabase.storage.from(BUCKET);
  const { error } = await bucket.upload(LETTER_PATH, JSON.stringify(letter), {
    contentType: 'application/json',
    upsert: true,
  });
  if (error) throw error;
}

export async function deleteLetter(supabase: SupabaseClient): Promise<void> {
  const bucket = supabase.storage.from(BUCKET);
  await bucket.remove([LETTER_PATH]);
}
