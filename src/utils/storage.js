// ==============================================================================
// GESTOR DE ALMACENAMIENTO (IndexedDB + LocalStorage)
// Permite guardar fotos de las citas en alta resolución sin límite estricto
// ==============================================================================

const DB_NAME = 'propuesta_romantica_db';
const DB_VERSION = 1;
const STORE_NAME = 'date_memories';

// Inicializar IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Recuerdos iniciales inspirados en momentos románticos
const INITIAL_MEMORIES = [
  {
    id: 'mem_1',
    title: 'Nuestra primera salida mágica ✨',
    date: '2026-09-15',
    location: 'Café & Paseo',
    caption: 'El día en que el tiempo pasó volando y no quería que se terminara.',
    // Usamos el fondo de flores como ejemplo inicial
    imageUrl: '/img/fondo.jpg',
    driveUrl: null,
    driveFileId: null,
    isLocal: true,
    timestamp: Date.now() - 86400000 * 10
  },
  {
    id: 'mem_2',
    title: 'Flores, risas y miradas cómplices 🌻',
    date: '2026-09-21',
    location: 'Tarde de flores amarillas',
    caption: 'Cada flor me recuerda la luz tan hermosa que tienes en tu sonrisa.',
    imageUrl: '/img/horizontal.jpg',
    driveUrl: null,
    driveFileId: null,
    isLocal: true,
    timestamp: Date.now() - 86400000 * 4
  }
];

export async function getMemories() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const results = req.result;
        if (!results || results.length === 0) {
          // Si está vacío, cargar los iniciales
          INITIAL_MEMORIES.forEach(m => saveMemory(m));
          resolve(INITIAL_MEMORIES);
        } else {
          // Ordenar por fecha descendente
          results.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          resolve(results);
        }
      };
      req.onerror = () => resolve(INITIAL_MEMORIES);
    });
  } catch (e) {
    console.warn('Fallback a LocalStorage para recuerdos:', e);
    const local = localStorage.getItem('propuesta_memories');
    return local ? JSON.parse(local) : INITIAL_MEMORIES;
  }
}

export async function saveMemory(memory) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(memory);
      req.onsuccess = () => resolve(memory);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('Fallback guardado en LocalStorage:', e);
    const current = await getMemories();
    const updated = [memory, ...current.filter(m => m.id !== memory.id)];
    try {
      localStorage.setItem('propuesta_memories', JSON.stringify(updated.slice(0, 10)));
    } catch (err) {}
    return memory;
  }
}

export async function deleteMemory(id) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    return false;
  }
}

// Configuración de los eventos (públicos y secretos/ocultos) y RSVP
const DEFAULT_EVENTS = [
  {
    id: 1,
    badge: 'CITA ESPECIAL #1',
    title: 'Cena Romántica bajo las Estrellas 🍷✨',
    date: '2026-10-03',
    time: '19:30',
    location: 'Un rincón mágico con buena vista y comida deliciosa',
    dressCode: 'Elegante & lo que te haga sentir la más hermosa',
    description: 'Quiero una noche donde el tiempo se detenga para nosotros dos, para reírnos de todo, platicar horas y celebrar lo bonita que eres.',
    secretHint: 'Habrá un postre sorpresa que te va a fascinar 🍰',
    isHidden: false,
    secretCode: '',
    secretClue: '',
    accepted: false,
    acceptedAt: null
  },
  {
    id: 2,
    badge: 'CITA ESPECIAL #2',
    title: 'Tarde de Picnic & Atardecer de Película 🧺🌅',
    date: '2026-10-10',
    time: '16:00',
    location: 'Al aire libre, rodeados de flores y brisa suave',
    dressCode: 'Cómodo para recostarnos a ver el atardecer',
    description: 'Una tarde perfecta con tu música favorita, snacks deliciosos y el mejor lugar para ver cómo se oculta el sol juntos.',
    secretHint: 'Llevo una cámara instantánea para capturar cada risa 📸🌻',
    isHidden: false,
    secretCode: '',
    secretClue: '',
    accepted: false,
    acceptedAt: null
  },
  {
    id: 3,
    badge: '🔒 CITA SECRETA #1',
    title: 'Noche de Estrellas, Deseos & Serenata Privada ✨🎶',
    date: '2026-10-18',
    time: '20:00',
    location: 'Un mirador secreto donde solo se escucha el viento',
    dressCode: 'Abrigo suave para una noche mágica bajo las estrellas',
    description: 'Una sorpresa preparada con todo el cariño y misterio del mundo. Un rincón con velitas, cobijas cálidas y algo muy especial que compuse pensando en ti.',
    secretHint: 'Lleva tus audífonos o prepárate para escuchar algo inolvidable 🎧💖',
    isHidden: true,
    secretCode: 'girasol',
    secretClue: 'Nuestra flor amarilla favorita que siempre sonríe al sol 🌻',
    accepted: false,
    acceptedAt: null
  }
];

export function getEvents() {
  try {
    const saved = localStorage.getItem('propuesta_events');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return DEFAULT_EVENTS;
}

export function saveEvents(events) {
  try {
    localStorage.setItem('propuesta_events', JSON.stringify(events));
    window.dispatchEvent(new CustomEvent('events_updated', { detail: events }));
  } catch (e) {}
}

export function addEvent(eventData) {
  const events = getEvents();
  const newId = Date.now();
  const isHidden = !!eventData.isHidden;
  const newEvent = {
    id: newId,
    badge: eventData.badge || (isHidden ? '🔒 CITA SECRETA' : `CITA #${events.length + 1}`),
    title: eventData.title || 'Nueva Cita Especial',
    date: eventData.date || new Date().toISOString().split('T')[0],
    time: eventData.time || '19:30',
    location: eventData.location || 'Por definir',
    dressCode: eventData.dressCode || 'Cómodo & elegante',
    description: eventData.description || '',
    secretHint: eventData.secretHint || '',
    isHidden: isHidden,
    secretCode: (eventData.secretCode || '').trim(),
    secretClue: (eventData.secretClue || '').trim(),
    accepted: false,
    acceptedAt: null,
    createdAt: new Date().toISOString()
  };
  events.push(newEvent);
  saveEvents(events);
  return newEvent;
}

export function updateEvent(eventId, partialData) {
  const events = getEvents();
  const index = events.findIndex(e => e.id === eventId);
  if (index !== -1) {
    events[index] = {
      ...events[index],
      ...partialData
    };
    saveEvents(events);
    return events[index];
  }
  return null;
}

export function deleteEvent(eventId) {
  const events = getEvents();
  const filtered = events.filter(e => e.id !== eventId);
  saveEvents(filtered);
  return true;
}

export function updateEventRSVP(eventId, accepted) {
  const events = getEvents();
  const index = events.findIndex(e => e.id === eventId);
  if (index !== -1) {
    events[index].accepted = accepted;
    events[index].acceptedAt = accepted ? new Date().toISOString() : null;
    saveEvents(events);
  }
  return events;
}

// ------------------------------------------------------------------------------
// GESTIÓN DE PIN PARA MODO CREADOR / ADMIN
// ------------------------------------------------------------------------------
const DEFAULT_PIN = '1234';

export function getAdminPIN() {
  try {
    return localStorage.getItem('propuesta_admin_pin') || DEFAULT_PIN;
  } catch {
    return DEFAULT_PIN;
  }
}

export function setAdminPIN(newPin) {
  try {
    localStorage.setItem('propuesta_admin_pin', newPin);
    return true;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------------------
// DESBLOQUEO DE CITAS SECRETAS / OCULTAS (Para la vista de Adi)
// ------------------------------------------------------------------------------
export function getUnlockedSecrets() {
  try {
    const saved = localStorage.getItem('propuesta_unlocked_secrets');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function isEventSecretUnlocked(eventId) {
  const unlocked = getUnlockedSecrets();
  return unlocked.includes(eventId);
}

export function unlockSecretEvent(eventId) {
  const unlocked = getUnlockedSecrets();
  if (!unlocked.includes(eventId)) {
    unlocked.push(eventId);
    try {
      localStorage.setItem('propuesta_unlocked_secrets', JSON.stringify(unlocked));
    } catch {}
    window.dispatchEvent(new CustomEvent('secret_unlocked', { detail: { eventId } }));
  }
}

export function lockSecretEvent(eventId) {
  let unlocked = getUnlockedSecrets();
  unlocked = unlocked.filter(id => id !== eventId);
  try {
    localStorage.setItem('propuesta_unlocked_secrets', JSON.stringify(unlocked));
  } catch {}
  window.dispatchEvent(new CustomEvent('secret_locked', { detail: { eventId } }));
}

