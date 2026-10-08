import { SupabaseClient } from '@supabase/supabase-js';
import type { IdeaItem, IdeaPayload } from '@/types/ideas';
import { BUCKET, PREFIX } from './memoriesService';

// ==============================================================================
// Lista de planes futuros (titulo + link de TikTok/Instagram) en Supabase Storage.
// Se guarda como un unico JSON: propuesta/ideas.json con el arreglo completo.
// Comparte el mismo bucket/prefijo que los recuerdos de la galeria.
// ==============================================================================

const IDEAS_PATH = `${PREFIX}/ideas.json`;

async function readIdeas(supabase: SupabaseClient): Promise<IdeaItem[]> {
  const bucket = supabase.storage.from(BUCKET);
  const { data, error } = await bucket.download(IDEAS_PATH);
  if (error) return [];
  try {
    return JSON.parse(await data.text()) as IdeaItem[];
  } catch {
    return [];
  }
}

async function writeIdeas(supabase: SupabaseClient, ideas: IdeaItem[]): Promise<void> {
  const bucket = supabase.storage.from(BUCKET);
  const { error } = await bucket.upload(IDEAS_PATH, JSON.stringify(ideas), {
    contentType: 'application/json',
    upsert: true,
  });
  if (error) throw error;
}

export async function listIdeas(supabase: SupabaseClient): Promise<IdeaItem[]> {
  const ideas = await readIdeas(supabase);
  return [...ideas].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '') || b.id - a.id);
}

export async function addIdea(supabase: SupabaseClient, payload: IdeaPayload): Promise<IdeaItem> {
  const ideas = await readIdeas(supabase);
  const newIdea: IdeaItem = {
    id: Date.now(),
    title: (payload.title || '').trim() || 'Nuevo plan',
    link: (payload.link || '').trim(),
    createdAt: new Date().toISOString(),
  };
  ideas.unshift(newIdea);
  await writeIdeas(supabase, ideas);
  return newIdea;
}

export async function updateIdea(supabase: SupabaseClient, id: number, payload: IdeaPayload): Promise<IdeaItem | null> {
  const ideas = await readIdeas(supabase);
  const index = ideas.findIndex((i) => i.id === id);
  if (index === -1) return null;

  ideas[index] = {
    ...ideas[index],
    title: payload.title !== undefined ? payload.title.trim() || ideas[index].title : ideas[index].title,
    link: payload.link !== undefined ? payload.link.trim() : ideas[index].link,
  };
  await writeIdeas(supabase, ideas);
  return ideas[index];
}

export async function deleteIdea(supabase: SupabaseClient, id: number): Promise<boolean> {
  const ideas = await readIdeas(supabase);
  const filtered = ideas.filter((i) => i.id !== id);
  if (filtered.length === ideas.length) return false;
  await writeIdeas(supabase, filtered);
  return true;
}
