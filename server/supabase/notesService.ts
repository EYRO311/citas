import { SupabaseClient } from '@supabase/supabase-js';
import { NOTES_MAX_LENGTH, type BookNotes } from '@/types/notes';
import { BUCKET, PREFIX } from './memoriesService';

// ==============================================================================
// Página de notas del modo libro (lo que Adi escribe a mano en el libro).
// Se guarda como un unico JSON: propuesta/notes.json.
// Comparte el mismo bucket/prefijo que los recuerdos de la galeria.
// ==============================================================================

const NOTES_PATH = `${PREFIX}/notes.json`;

export async function readNotes(supabase: SupabaseClient): Promise<BookNotes> {
  const bucket = supabase.storage.from(BUCKET);
  const { data, error } = await bucket.download(NOTES_PATH);
  if (error) return { text: '' };
  try {
    const parsed = JSON.parse(await data.text()) as BookNotes;
    return { text: typeof parsed.text === 'string' ? parsed.text : '', updatedAt: parsed.updatedAt };
  } catch {
    return { text: '' };
  }
}

export async function writeNotes(supabase: SupabaseClient, text: string): Promise<BookNotes> {
  const notes: BookNotes = { text: text.slice(0, NOTES_MAX_LENGTH), updatedAt: new Date().toISOString() };
  const bucket = supabase.storage.from(BUCKET);
  const { error } = await bucket.upload(NOTES_PATH, JSON.stringify(notes), {
    contentType: 'application/json',
    upsert: true,
  });
  if (error) throw error;
  return notes;
}
