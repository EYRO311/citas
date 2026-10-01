import type { LocalMemory } from '@/types/memories';

const DB_NAME = 'propuesta_romantica_db';
const DB_VERSION = 1;
const STORE_NAME = 'date_memories';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const INITIAL_MEMORIES: LocalMemory[] = [
  {
    id: 'mem_1',
    title: 'Nuestra primera salida mágica ✨',
    date: '2026-09-15',
    location: 'Café & Paseo',
    caption: 'El día en que el tiempo pasó volando y no quería que se terminara.',
    imageUrl: '/img/fondo.jpg',
    driveUrl: null,
    driveFileId: null,
    isLocal: true,
    timestamp: Date.now() - 86400000 * 10,
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
    timestamp: Date.now() - 86400000 * 4,
  },
];

export async function getMemories(): Promise<LocalMemory[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const results = req.result as LocalMemory[];
        if (!results || results.length === 0) {
          INITIAL_MEMORIES.forEach((m) => saveMemory(m));
          resolve(INITIAL_MEMORIES);
        } else {
          results.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          resolve(results);
        }
      };
      req.onerror = () => resolve(INITIAL_MEMORIES);
    });
  } catch {
    const local = localStorage.getItem('propuesta_memories');
    return local ? (JSON.parse(local) as LocalMemory[]) : INITIAL_MEMORIES;
  }
}

export async function saveMemory(memory: LocalMemory): Promise<LocalMemory> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(memory);
      req.onsuccess = () => resolve(memory);
      req.onerror = () => reject(req.error);
    });
  } catch {
    const current = await getMemories();
    const updated = [memory, ...current.filter((m) => m.id !== memory.id)];
    try {
      localStorage.setItem('propuesta_memories', JSON.stringify(updated.slice(0, 10)));
    } catch {
      // ignore
    }
    return memory;
  }
}

export async function deleteMemory(id: string): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return false;
  }
}
