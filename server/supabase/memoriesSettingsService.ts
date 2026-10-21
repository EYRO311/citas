import { SupabaseClient } from '@supabase/supabase-js';
import type { MemoriesSettings } from '@/types/memories';
import { BUCKET, PREFIX } from './memoriesService';

// ==============================================================================
// Orden de los recuerdos en el libro (ver tipos/memories.ts: MemoriesSortMode).
// Se guarda como un único JSON: propuesta/memories-order.json.
// Comparte el mismo bucket/prefijo que los recuerdos de la galería; el nombre no
// empieza con un id válido de recuerdo así que listMemories() lo ignora.
// ==============================================================================

const SETTINGS_PATH = `${PREFIX}/memories-order.json`;

const DEFAULT_SETTINGS: MemoriesSettings = { sortMode: 'date', manualOrder: [] };

export async function readMemoriesSettings(supabase: SupabaseClient): Promise<MemoriesSettings> {
  const bucket = supabase.storage.from(BUCKET);
  const { data, error } = await bucket.download(SETTINGS_PATH);
  if (error) return DEFAULT_SETTINGS;
  try {
    const parsed = JSON.parse(await data.text());
    const sortMode: MemoriesSettings['sortMode'] =
      parsed.sortMode === 'manual' || parsed.sortMode === 'created' ? parsed.sortMode : 'date';
    const manualOrder = Array.isArray(parsed.manualOrder) ? parsed.manualOrder.filter((x: unknown) => typeof x === 'string') : [];
    return { sortMode, manualOrder };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function writeMemoriesSettings(supabase: SupabaseClient, settings: MemoriesSettings): Promise<MemoriesSettings> {
  const clean: MemoriesSettings = {
    sortMode: settings.sortMode === 'manual' || settings.sortMode === 'created' ? settings.sortMode : 'date',
    manualOrder: Array.isArray(settings.manualOrder) ? settings.manualOrder.filter((x) => typeof x === 'string') : [],
  };
  const bucket = supabase.storage.from(BUCKET);
  const { error } = await bucket.upload(SETTINGS_PATH, JSON.stringify(clean), {
    contentType: 'application/json',
    upsert: true,
  });
  if (error) throw error;
  return clean;
}
