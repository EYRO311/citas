import type { Memory, MemoriesSettings } from '@/types/memories';

/** Clave estable de un recuerdo entre dispositivos (sobrevive a re-sincronizaciones locales). */
export function memoryKey(memory: Memory): string | null {
  if ('storageId' in memory && memory.storageId) return `sb:${memory.storageId}`;
  if ('driveFileId' in memory && memory.driveFileId) return `drive:${memory.driveFileId}`;
  return null;
}

function byDateAsc(a: Memory, b: Memory): number {
  return (a.date || '').localeCompare(b.date || '') || (a.timestamp || 0) - (b.timestamp || 0);
}

function byCreatedAsc(a: Memory, b: Memory): number {
  return (a.timestamp || 0) - (b.timestamp || 0);
}

/** Orden de los recuerdos para el libro: de la primera página (más vieja) a la última. */
export function sortMemories(memories: Memory[], settings: MemoriesSettings): Memory[] {
  if (settings.sortMode === 'created') {
    return [...memories].sort(byCreatedAsc);
  }

  if (settings.sortMode === 'manual') {
    const order = settings.manualOrder;
    const rank = (m: Memory) => {
      const key = memoryKey(m);
      return key ? order.indexOf(key) : -1;
    };
    const ranked = memories.filter((m) => rank(m) >= 0).sort((a, b) => rank(a) - rank(b));
    // Los recuerdos que aún no se acomodaron a mano (nuevos) se agregan al final por fecha.
    const unranked = memories.filter((m) => rank(m) < 0).sort(byDateAsc);
    return [...ranked, ...unranked];
  }

  return [...memories].sort(byDateAsc);
}
