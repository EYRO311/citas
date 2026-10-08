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

const INITIAL_MEMORIES: LocalMemory[] = [];
const SAMPLE_IDS = ['mem_1', 'mem_2'];

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
          const sampleLeftovers = results.filter((m) => SAMPLE_IDS.includes(m.id));
          sampleLeftovers.forEach((m) => deleteMemory(m.id));
          const cleaned = results.filter((m) => !SAMPLE_IDS.includes(m.id));
          cleaned.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          resolve(cleaned);
        }
      };
      req.onerror = () => resolve(INITIAL_MEMORIES);
    });
  } catch {
    const local = localStorage.getItem('propuesta_memories');
    if (!local) return INITIAL_MEMORIES;
    const parsed = JSON.parse(local) as LocalMemory[];
    return parsed.filter((m) => !SAMPLE_IDS.includes(m.id));
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
