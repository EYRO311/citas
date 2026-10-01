import type { EventItem, EventPayload } from '@/types/events';

const STORAGE_KEY = 'propuesta_events';

const DEFAULT_EVENTS: EventItem[] = [
  {
    id: 1,
    badge: 'CITA ESPECIAL #1',
    title: 'Cena Romántica bajo las Estrellas 🍷✨',
    date: '2026-10-03',
    time: '19:30',
    location: 'Un rincón mágico con buena vista y comida deliciosa',
    dressCode: 'Elegante & lo que te haga sentir la más hermosa',
    description:
      'Quiero una noche donde el tiempo se detenga para nosotros dos, para reírnos de todo, platicar horas y celebrar lo bonita que eres.',
    secretHint: 'Habrá un postre sorpresa que te va a fascinar 🍰',
    isHidden: false,
    secretCode: '',
    secretClue: '',
    accepted: false,
    acceptedAt: null,
  },
  {
    id: 2,
    badge: 'CITA ESPECIAL #2',
    title: 'Tarde de Picnic & Atardecer de Película 🧺🌅',
    date: '2026-10-10',
    time: '16:00',
    location: 'Al aire libre, rodeados de flores y brisa suave',
    dressCode: 'Cómodo para recostarnos a ver el atardecer',
    description:
      'Una tarde perfecta con tu música favorita, snacks deliciosos y el mejor lugar para ver cómo se oculta el sol juntos.',
    secretHint: 'Llevo una cámara instantánea para capturar cada risa 📸🌻',
    isHidden: false,
    secretCode: '',
    secretClue: '',
    accepted: false,
    acceptedAt: null,
  },
  {
    id: 3,
    badge: '🔒 CITA SECRETA #1',
    title: 'Noche de Estrellas, Deseos & Serenata Privada ✨🎶',
    date: '2026-10-18',
    time: '20:00',
    location: 'Un mirador secreto donde solo se escucha el viento',
    dressCode: 'Abrigo suave para una noche mágica bajo las estrellas',
    description:
      'Una sorpresa preparada con todo el cariño y misterio del mundo. Un rincón con velitas, cobijas cálidas y algo muy especial que compuse pensando en ti.',
    secretHint: 'Lleva tus audífonos o prepárate para escuchar algo inolvidable 🎧💖',
    isHidden: true,
    secretCode: 'girasol',
    secretClue: 'Nuestra flor amarilla favorita que siempre sonríe al sol 🌻',
    revealDate: '2026-10-18',
    revealTime: '20:00',
    forceReveal: false,
    accepted: false,
    acceptedAt: null,
  },
];

export function getEvents(): EventItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved) as EventItem[];
  } catch {
    // ignore parse/storage errors, fall back to defaults
  }
  return DEFAULT_EVENTS;
}

export function saveEvents(events: EventItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    window.dispatchEvent(new CustomEvent('events_updated', { detail: events }));
  } catch {
    // storage unavailable (private mode, quota, etc.) — silently ignore like before
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
