import { SupabaseClient } from '@supabase/supabase-js';
import type { IdeaItem, IdeaPayload } from '@/types/ideas';
import { normalizeUrl } from '@/modules/ideas/domain/links';
import { BUCKET, PREFIX } from './memoriesService';

// ==============================================================================
// Lista de planes futuros (titulo + link a cualquier red + imagen opcional) en
// Supabase Storage. Se guarda como un unico JSON: propuesta/ideas.json con el
// arreglo completo. Las imagenes subidas van en propuesta/ideas/<id>_<timestamp>.<ext>.
// Comparte el mismo bucket/prefijo que los recuerdos de la galeria.
// ==============================================================================

const IDEAS_PATH = `${PREFIX}/ideas.json`;
const IMAGES_DIR = `${PREFIX}/ideas`;

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

// Solo links http(s): se muestran tal cual en la pagina publica
const cleanUrl = normalizeUrl;

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

// Ruta dentro del bucket si la imagen la subimos nosotros; null si es un link externo
function ownedImagePath(supabase: SupabaseClient, url: string | undefined): string | null {
  if (!url) return null;
  const base = supabase.storage.from(BUCKET).getPublicUrl('').data.publicUrl;
  const path = url.startsWith(base) ? url.slice(base.length) : '';
  return path.startsWith(`${IMAGES_DIR}/`) ? path : null;
}

async function removeOwnedImage(supabase: SupabaseClient, url: string | undefined): Promise<void> {
  const path = ownedImagePath(supabase, url);
  if (!path) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) console.warn('No se pudo borrar la imagen del plan:', error);
}

// Devuelve la URL final de la imagen segun lo que mande el formulario
async function resolveImage(
  supabase: SupabaseClient,
  ideaId: number,
  payload: IdeaPayload,
  previous: string | undefined
): Promise<string | undefined> {
  if (payload.imageUpload?.base64) {
    const mimeType = payload.imageUpload.mimeType || 'image/jpeg';
    const path = `${IMAGES_DIR}/${ideaId}_${Date.now()}.${EXTENSIONS[mimeType] || 'jpg'}`;
    const buffer = Buffer.from(payload.imageUpload.base64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const bucket = supabase.storage.from(BUCKET);
    const { error } = await bucket.upload(path, buffer, { contentType: mimeType, cacheControl: '31536000', upsert: false });
    if (error) throw error;
    return bucket.getPublicUrl(path).data.publicUrl;
  }
  if (payload.image !== undefined) return cleanUrl(payload.image) || undefined;
  return previous;
}

export async function listIdeas(supabase: SupabaseClient): Promise<IdeaItem[]> {
  const ideas = await readIdeas(supabase);
  return [...ideas].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '') || b.id - a.id);
}

export async function addIdea(supabase: SupabaseClient, payload: IdeaPayload): Promise<IdeaItem> {
  const ideas = await readIdeas(supabase);
  const id = Date.now();
  const image = await resolveImage(supabase, id, payload, undefined);
  const newIdea: IdeaItem = {
    id,
    title: (payload.title || '').trim() || 'Nuevo plan',
    link: cleanUrl(payload.link),
    ...(image ? { image } : {}),
    createdAt: new Date().toISOString(),
  };
  ideas.unshift(newIdea);
  try {
    await writeIdeas(supabase, ideas);
  } catch (error) {
    await removeOwnedImage(supabase, image);
    throw error;
  }
  return newIdea;
}

export async function updateIdea(supabase: SupabaseClient, id: number, payload: IdeaPayload): Promise<IdeaItem | null> {
  const ideas = await readIdeas(supabase);
  const index = ideas.findIndex((i) => i.id === id);
  if (index === -1) return null;

  const previous = ideas[index];
  const image = await resolveImage(supabase, id, payload, previous.image);
  const next: IdeaItem = {
    ...previous,
    title: payload.title !== undefined ? payload.title.trim() || previous.title : previous.title,
    link: payload.link !== undefined ? cleanUrl(payload.link) : previous.link,
    image,
  };
  if (!image) delete next.image;
  ideas[index] = next;
  try {
    await writeIdeas(supabase, ideas);
  } catch (error) {
    if (image !== previous.image) await removeOwnedImage(supabase, image);
    throw error;
  }
  if (image !== previous.image) await removeOwnedImage(supabase, previous.image);
  return ideas[index];
}

export async function deleteIdea(supabase: SupabaseClient, id: number): Promise<boolean> {
  const ideas = await readIdeas(supabase);
  const removed = ideas.find((i) => i.id === id);
  if (!removed) return false;
  await writeIdeas(
    supabase,
    ideas.filter((i) => i.id !== id)
  );
  await removeOwnedImage(supabase, removed.image);
  return true;
}
