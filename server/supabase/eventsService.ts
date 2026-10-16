import { SupabaseClient } from '@supabase/supabase-js';
import type { EventItem, EventPayload } from '@/types/events';
import { DEFAULT_EVENTS } from '@/modules/events/data/defaultEvents';
import { BUCKET, PREFIX } from './memoriesService';

// ==============================================================================
// Citas y eventos románticos en Supabase Storage.
// Se guarda como un único JSON: propuesta/events.json con el arreglo completo.
// Comparte el mismo bucket/prefijo que la carta, ideas y recuerdos.
// ==============================================================================

const EVENTS_PATH = `${PREFIX}/events.json`;

export async function readEvents(supabase: SupabaseClient): Promise<EventItem[]> {
  const bucket = supabase.storage.from(BUCKET);
  const { data, error } = await bucket.download(EVENTS_PATH);
  if (error) {
    // Si aún no existe el archivo en Supabase, inicializarlo con DEFAULT_EVENTS
    try {
      await writeEvents(supabase, DEFAULT_EVENTS);
      return DEFAULT_EVENTS;
    } catch {
      return DEFAULT_EVENTS;
    }
  }
  try {
    const text = await data.text();
    const parsed = JSON.parse(text) as EventItem[];
    if (Array.isArray(parsed)) return parsed;
    return DEFAULT_EVENTS;
  } catch {
    return DEFAULT_EVENTS;
  }
}

export async function writeEvents(supabase: SupabaseClient, events: EventItem[]): Promise<void> {
  const bucket = supabase.storage.from(BUCKET);
  const { error } = await bucket.upload(EVENTS_PATH, JSON.stringify(events, null, 2), {
    contentType: 'application/json',
    upsert: true,
  });
  if (error) throw error;
}

export async function listEvents(supabase: SupabaseClient): Promise<EventItem[]> {
  return await readEvents(supabase);
}

export async function addEvent(supabase: SupabaseClient, payload: EventPayload): Promise<EventItem> {
  const events = await readEvents(supabase);
  const newId = Date.now();
  const isHidden = !!payload.isHidden;
  const newEvent: EventItem = {
    id: newId,
    badge: payload.badge || (isHidden ? '🔒 CITA SECRETA' : `CITA #${events.length + 1}`),
    title: payload.title || 'Nueva Cita Especial',
    date: payload.date || new Date().toISOString().split('T')[0],
    time: payload.time || '19:30',
    location: payload.location || 'Por definir',
    dressCode: payload.dressCode || 'Cómodo & elegante',
    description: payload.description || '',
    secretHint: payload.secretHint || '',
    isHidden,
    secretCode: (payload.secretCode || '').trim(),
    secretClue: (payload.secretClue || '').trim(),
    revealDate: (payload.revealDate || payload.date || '').trim(),
    revealTime: (payload.revealTime || payload.time || '19:30').trim(),
    forceReveal: !!payload.forceReveal,
    accepted: false,
    acceptedAt: null,
    createdAt: new Date().toISOString(),
  };

  events.push(newEvent);
  await writeEvents(supabase, events);
  return newEvent;
}

export async function updateEvent(
  supabase: SupabaseClient,
  id: number,
  payload: Partial<EventItem>
): Promise<EventItem | null> {
  const events = await readEvents(supabase);
  const index = events.findIndex((e) => e.id === id);
  if (index === -1) return null;

  events[index] = {
    ...events[index],
    ...payload,
  };
  await writeEvents(supabase, events);
  return events[index];
}

export async function deleteEvent(supabase: SupabaseClient, id: number): Promise<boolean> {
  const events = await readEvents(supabase);
  const filtered = events.filter((e) => e.id !== id);
  if (filtered.length === events.length) return false;
  await writeEvents(supabase, filtered);
  return true;
}

export async function updateEventRSVP(
  supabase: SupabaseClient,
  id: number,
  accepted: boolean
): Promise<EventItem | null> {
  const events = await readEvents(supabase);
  const index = events.findIndex((e) => e.id === id);
  if (index === -1) return null;

  events[index].accepted = accepted;
  events[index].acceptedAt = accepted ? new Date().toISOString() : null;
  await writeEvents(supabase, events);
  return events[index];
}

export async function replaceAllEvents(supabase: SupabaseClient, events: EventItem[]): Promise<void> {
  await writeEvents(supabase, events);
}
