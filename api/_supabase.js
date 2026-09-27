import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// ==============================================================================
// Recuerdos en Supabase Storage (bucket compartido "anuncios", prefijo "propuesta/")
//
// Cada recuerdo son dos archivos:
//   propuesta/<id>.jpg   → la foto (URL pública)
//   propuesta/<id>.json  → { id, title, date, location, caption, imagePath, createdAt }
// Las fotos subidas a mano en propuesta/ desde el panel de Supabase (sin .json)
// también se muestran, con título por defecto.
//
// El bucket lo comparte el proyecto de anuncios: nunca tocar nada fuera de PREFIX.
// ==============================================================================

export const BUCKET = 'anuncios';
export const PREFIX = 'propuesta';

// Sin puntos ni "/" → el id nunca puede salir de PREFIX
const ID_RE = /^[\w-]{1,100}$/;
export const isValidId = id => ID_RE.test(id || '');

const EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
const IMAGE_FILE_RE = /\.(jpe?g|png|webp|gif|heic|heif|avif)$/i;

// Cliente con service_role: solo en el servidor
export function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const baseName = name => name.replace(/\.[^.]+$/, '');

function toMemory(supabase, record) {
  const url = supabase.storage.from(BUCKET).getPublicUrl(record.imagePath).data.publicUrl;
  return {
    id: `sb_${record.id}`,
    storageId: record.id,
    title: record.title || 'Recuerdo de nuestra salida',
    date: record.date || (record.createdAt || '').slice(0, 10),
    location: record.location || '',
    caption: record.caption || '',
    thumbUrl: url,
    imageUrl: url,
    source: 'supabase',
    timestamp: Date.parse(record.createdAt) || 0
  };
}

export async function uploadMemory(supabase, { buffer, mimeType, meta }) {
  const bucket = supabase.storage.from(BUCKET);
  const id = randomUUID(); // aleatorio: la URL pública no se puede adivinar
  const imagePath = `${PREFIX}/${id}.${EXTENSIONS[mimeType] || 'jpg'}`;

  const image = await bucket.upload(imagePath, buffer, {
    contentType: mimeType,
    cacheControl: '31536000',
    upsert: false
  });
  if (image.error) throw image.error;

  const record = { id, ...meta, imagePath, createdAt: new Date().toISOString() };
  const json = await bucket.upload(`${PREFIX}/${id}.json`, JSON.stringify(record), {
    contentType: 'application/json',
    upsert: true
  });
  if (json.error) {
    await bucket.remove([imagePath]);
    throw json.error;
  }

  return toMemory(supabase, record);
}

export async function listMemories(supabase) {
  const bucket = supabase.storage.from(BUCKET);
  const { data: files, error } = await bucket.list(PREFIX, {
    limit: 1000,
    sortBy: { column: 'created_at', order: 'desc' }
  });
  if (error) throw error;

  // Las carpetas vienen con id null
  const objects = (files || []).filter(f => f.id);

  const records = await Promise.all(
    objects
      .filter(f => f.name.endsWith('.json'))
      .map(async f => {
        const { data: blob, error: dlError } = await bucket.download(`${PREFIX}/${f.name}`);
        if (dlError) return null;
        try {
          return JSON.parse(await blob.text());
        } catch {
          return null;
        }
      })
  );

  const byId = new Map();
  for (const record of records) {
    if (record && isValidId(record.id) && (record.imagePath || '').startsWith(`${PREFIX}/`)) {
      byId.set(record.id, record);
    }
  }

  // Fotos sin .json (subidas a mano desde el panel de Supabase)
  for (const f of objects) {
    const id = baseName(f.name);
    if (IMAGE_FILE_RE.test(f.name) && isValidId(id) && !byId.has(id)) {
      byId.set(id, { id, imagePath: `${PREFIX}/${f.name}`, createdAt: f.created_at });
    }
  }

  return [...byId.values()].map(record => toMemory(supabase, record));
}

// Borra la foto y su .json (todos los archivos propuesta/<id>.*)
export async function deleteMemory(supabase, id) {
  const bucket = supabase.storage.from(BUCKET);
  const { data: files, error } = await bucket.list(PREFIX, { limit: 100, search: id });
  if (error) throw error;

  const paths = (files || [])
    .filter(f => f.id && baseName(f.name) === id)
    .map(f => `${PREFIX}/${f.name}`);
  if (paths.length === 0) return 0;

  const { error: removeError } = await bucket.remove(paths);
  if (removeError) throw removeError;
  return paths.length;
}
