import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import type { MemoryMeta, RemoteMemory } from '@/types/memories';

// ==============================================================================
// Recuerdos en Supabase Storage (bucket compartido "anuncios", prefijo "propuesta/")
//
// Cada recuerdo es:
//   propuesta/<id>_0.jpg, propuesta/<id>_1.jpg, ...  → las fotos (URLs públicas)
//   propuesta/<id>.json                               → { id, title, date, location,
//                                                          caption, images, coverIndex, createdAt }
// Recuerdos antiguos (una sola foto) guardan `imagePath` en vez de `images` y se
// siguen leyendo igual. Las fotos subidas a mano en propuesta/ (sin .json) también
// se muestran, con título por defecto.
//
// El bucket lo comparte el proyecto de anuncios: nunca tocar nada fuera de PREFIX.
// ==============================================================================

export const BUCKET = 'anuncios';
export const PREFIX = 'propuesta';

const ID_RE = /^[\w-]{1,100}$/;
export const isValidId = (id?: string | null): boolean => ID_RE.test(id || '');

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
const IMAGE_FILE_RE = /\.(jpe?g|png|webp|gif|heic|heif|avif)$/i;

export function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const baseName = (name: string) => name.replace(/\.[^.]+$/, '');

interface MemoryRecord extends MemoryMeta {
  id: string;
  /** Formato nuevo: una o más fotos. */
  images?: string[];
  coverIndex?: number;
  /** Formato antiguo (una sola foto). */
  imagePath?: string;
  createdAt?: string;
}

function recordImagePaths(record: MemoryRecord): string[] {
  if (record.images && record.images.length) return record.images;
  if (record.imagePath) return [record.imagePath];
  return [];
}

function toMemory(supabase: SupabaseClient, record: MemoryRecord): RemoteMemory {
  const paths = recordImagePaths(record);
  const urls = paths.map((p) => supabase.storage.from(BUCKET).getPublicUrl(p).data.publicUrl);
  const coverIndex = Math.min(Math.max(record.coverIndex || 0, 0), Math.max(urls.length - 1, 0));
  const coverUrl = urls[coverIndex] || urls[0];

  return {
    id: `sb_${record.id}`,
    storageId: record.id,
    title: record.title || 'Recuerdo de nuestra salida',
    date: record.date || (record.createdAt || '').slice(0, 10),
    location: record.location || '',
    caption: record.caption || '',
    images: urls,
    coverIndex,
    thumbUrl: coverUrl,
    imageUrl: coverUrl,
    source: 'supabase',
    timestamp: Date.parse(record.createdAt || '') || 0,
  };
}

export async function uploadMemory(
  supabase: SupabaseClient,
  {
    files,
    meta,
    coverIndex = 0,
  }: { files: { buffer: Buffer; mimeType: string }[]; meta: MemoryMeta; coverIndex?: number }
): Promise<RemoteMemory> {
  const bucket = supabase.storage.from(BUCKET);
  const id = randomUUID();
  const uploadedPaths: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const ext = EXTENSIONS[files[i].mimeType] || 'jpg';
    const path = `${PREFIX}/${id}_${i}.${ext}`;
    const { error } = await bucket.upload(path, files[i].buffer, {
      contentType: files[i].mimeType,
      cacheControl: '31536000',
      upsert: false,
    });
    if (error) {
      if (uploadedPaths.length) await bucket.remove(uploadedPaths);
      throw error;
    }
    uploadedPaths.push(path);
  }

  const record: MemoryRecord = {
    id,
    ...meta,
    images: uploadedPaths,
    coverIndex: Math.min(Math.max(coverIndex, 0), uploadedPaths.length - 1),
    createdAt: new Date().toISOString(),
  };
  const json = await bucket.upload(`${PREFIX}/${id}.json`, JSON.stringify(record), {
    contentType: 'application/json',
    upsert: true,
  });
  if (json.error) {
    await bucket.remove(uploadedPaths);
    throw json.error;
  }

  return toMemory(supabase, record);
}

export async function listMemories(supabase: SupabaseClient): Promise<RemoteMemory[]> {
  const bucket = supabase.storage.from(BUCKET);
  const { data: files, error } = await bucket.list(PREFIX, {
    limit: 1000,
    sortBy: { column: 'created_at', order: 'desc' },
  });
  if (error) throw error;

  const objects = (files || []).filter((f) => f.id);

  const records = await Promise.all(
    objects
      .filter((f) => f.name.endsWith('.json'))
      .map(async (f) => {
        const { data: blob, error: dlError } = await bucket.download(`${PREFIX}/${f.name}`);
        if (dlError) return null;
        try {
          return JSON.parse(await blob.text()) as MemoryRecord;
        } catch {
          return null;
        }
      })
  );

  const byId = new Map<string, MemoryRecord>();
  const referencedPaths = new Set<string>();

  for (const record of records) {
    if (!record || !isValidId(record.id)) continue;
    const paths = recordImagePaths(record);
    if (paths.length === 0 || !paths.every((p) => p.startsWith(`${PREFIX}/`))) continue;
    byId.set(record.id, record);
    paths.forEach((p) => referencedPaths.add(p));
  }

  // Fotos sin .json (subidas a mano desde el panel de Supabase)
  for (const f of objects) {
    const path = `${PREFIX}/${f.name}`;
    if (referencedPaths.has(path)) continue;
    const id = baseName(f.name);
    if (IMAGE_FILE_RE.test(f.name) && isValidId(id) && !byId.has(id)) {
      byId.set(id, { id, imagePath: path, createdAt: f.created_at } as MemoryRecord);
    }
  }

  return [...byId.values()].map((record) => toMemory(supabase, record));
}

// Actualiza solo el texto (title/date/location/caption) del .json de un recuerdo; no toca las fotos.
export async function updateMemoryMeta(
  supabase: SupabaseClient,
  id: string,
  meta: Partial<MemoryMeta>
): Promise<RemoteMemory | null> {
  const bucket = supabase.storage.from(BUCKET);
  const { data: blob, error: dlError } = await bucket.download(`${PREFIX}/${id}.json`);
  if (dlError) return null;

  let record: MemoryRecord;
  try {
    record = JSON.parse(await blob.text()) as MemoryRecord;
  } catch {
    return null;
  }

  record = { ...record, ...meta, id };
  const { error } = await bucket.upload(`${PREFIX}/${id}.json`, JSON.stringify(record), {
    contentType: 'application/json',
    upsert: true,
  });
  if (error) throw error;

  return toMemory(supabase, record);
}

// Borra todas las fotos del recuerdo (propuesta/<id>_*.* y el <id>.json antiguo de una sola foto)
export async function deleteMemory(supabase: SupabaseClient, id: string): Promise<number> {
  const bucket = supabase.storage.from(BUCKET);
  const { data: files, error } = await bucket.list(PREFIX, { limit: 200, search: id });
  if (error) throw error;

  const paths = (files || [])
    .filter((f) => f.id && (baseName(f.name) === id || baseName(f.name).startsWith(`${id}_`)))
    .map((f) => `${PREFIX}/${f.name}`);
  if (paths.length === 0) return 0;

  const { error: removeError } = await bucket.remove(paths);
  if (removeError) throw removeError;
  return paths.length;
}
