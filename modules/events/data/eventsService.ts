import type { EventItem, EventPayload } from '@/types/events';
import {
  createCloudEvent,
  deleteCloudEvent,
  fetchCloudEvents,
  updateCloudEvent,
  updateCloudRSVP,
} from './eventsApiClient';
import {
  addEvent as addLocalEvent,
  cacheEvents,
  deleteEvent as deleteLocalEvent,
  getEvents as getLocalEvents,
  updateEvent as updateLocalEvent,
  updateEventRSVP as updateLocalEventRSVP,
} from './eventsRepository';

export interface LoadEventsResult {
  events: EventItem[];
  connected: boolean;
}

// Supabase es la fuente de verdad cuando está conectado; si no, usamos el
// respaldo local en localStorage.
export async function loadEvents(): Promise<LoadEventsResult> {
  const cloud = await fetchCloudEvents();
  if (cloud.connected && Array.isArray(cloud.events)) {
    cacheEvents(cloud.events);
    window.dispatchEvent(new CustomEvent('events_updated', { detail: cloud.events }));
    return { events: cloud.events, connected: true };
  }
  return { events: getLocalEvents(), connected: false };
}

export async function createEvent(payload: EventPayload): Promise<EventItem> {
  const cloudItem = await createCloudEvent(payload);
  if (cloudItem) {
    const current = getLocalEvents().filter((e) => e.id !== cloudItem.id);
    const updated = [...current, cloudItem];
    cacheEvents(updated);
    window.dispatchEvent(new CustomEvent('events_updated', { detail: updated }));
    return cloudItem;
  }
  return addLocalEvent(payload);
}

export async function modifyEvent(id: number, payload: Partial<EventItem>): Promise<EventItem | null> {
  const cloudItem = await updateCloudEvent(id, payload);
  if (cloudItem) {
    const current = getLocalEvents();
    const idx = current.findIndex((e) => e.id === id);
    if (idx !== -1) {
      current[idx] = cloudItem;
    } else {
      current.push(cloudItem);
    }
    cacheEvents(current);
    window.dispatchEvent(new CustomEvent('events_updated', { detail: current }));
    return cloudItem;
  }
  return updateLocalEvent(id, payload as EventPayload);
}

export async function removeEvent(id: number): Promise<boolean> {
  const ok = await deleteCloudEvent(id);
  if (ok) {
    const current = getLocalEvents().filter((e) => e.id !== id);
    cacheEvents(current);
    window.dispatchEvent(new CustomEvent('events_updated', { detail: current }));
    return true;
  }
  return deleteLocalEvent(id);
}

export async function setEventRSVP(id: number, accepted: boolean): Promise<EventItem | null> {
  // 1. Actualización optimista inmediata en local para respuesta fluida
  const localList = updateLocalEventRSVP(id, accepted);
  const localUpdated = localList.find((e) => e.id === id) || null;

  // 2. Persistencia en Supabase
  try {
    const cloudItem = await updateCloudRSVP(id, accepted);
    if (cloudItem) {
      const current = getLocalEvents();
      const idx = current.findIndex((e) => e.id === id);
      if (idx !== -1) {
        current[idx] = cloudItem;
        cacheEvents(current);
        window.dispatchEvent(new CustomEvent('events_updated', { detail: current }));
      }
      return cloudItem;
    }
  } catch {
    // Si falla la red, el estado optimista local ya quedó registrado
  }

  return localUpdated;
}
