import type { EventItem, EventPayload } from '@/types/events';
import { DEFAULT_EVENTS } from './defaultEvents';

export { DEFAULT_EVENTS };

const STORAGE_KEY = 'propuesta_events';

export function getEvents(): EventItem[] {
  if (typeof window === 'undefined') return DEFAULT_EVENTS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore parse/storage errors, fall back to defaults
  }
  return DEFAULT_EVENTS;
}

export function saveEvents(events: EventItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    window.dispatchEvent(new CustomEvent('events_updated', { detail: events }));
  } catch {
    // storage unavailable
  }
}

export function cacheEvents(events: EventItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // storage unavailable
  }
}

export function addEvent(eventData: EventPayload): EventItem {
  const events = getEvents();
  const newId = Date.now();
  const isHidden = !!eventData.isHidden;
  const newEvent: EventItem = {
    id: newId,
    badge: eventData.badge || (isHidden ? '🔒 CITA SECRETA' : `CITA #${events.length + 1}`),
    title: eventData.title || 'Nueva Cita Especial',
    date: eventData.date || new Date().toISOString().split('T')[0],
    time: eventData.time || '19:30',
    location: eventData.location || 'Por definir',
    dressCode: eventData.dressCode || 'Cómodo & elegante',
    description: eventData.description || '',
    secretHint: eventData.secretHint || '',
    isHidden,
    secretCode: (eventData.secretCode || '').trim(),
    secretClue: (eventData.secretClue || '').trim(),
    revealDate: (eventData.revealDate || eventData.date || '').trim(),
    revealTime: (eventData.revealTime || eventData.time || '19:30').trim(),
    forceReveal: !!eventData.forceReveal,
    accepted: false,
    acceptedAt: null,
    createdAt: new Date().toISOString(),
  };
  events.push(newEvent);
  saveEvents(events);
  return newEvent;
}

export function updateEvent(eventId: number, partialData: EventPayload): EventItem | null {
  const events = getEvents();
  const index = events.findIndex((e) => e.id === eventId);
  if (index !== -1) {
    events[index] = {
      ...events[index],
      ...partialData,
    };
    saveEvents(events);
    return events[index];
  }
  return null;
}

export function deleteEvent(eventId: number): boolean {
  const events = getEvents();
  const filtered = events.filter((e) => e.id !== eventId);
  saveEvents(filtered);
  return true;
}

export function updateEventRSVP(eventId: number, accepted: boolean): EventItem[] {
  const events = getEvents();
  const index = events.findIndex((e) => e.id === eventId);
  if (index !== -1) {
    events[index].accepted = accepted;
    events[index].acceptedAt = accepted ? new Date().toISOString() : null;
    saveEvents(events);
  }
  return events;
}
