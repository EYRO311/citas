import type { LocalMemory, Memory, RemoteMemory } from '@/types/memories';

export function mergeMemories(
  local: LocalMemory[],
  cloudMemories: RemoteMemory[],
  driveMemories: RemoteMemory[]
): Memory[] {
  const remoteByKey = new Map<string, RemoteMemory>([
    ...cloudMemories.map((m): [string, RemoteMemory] => [`sb:${m.storageId}`, m]),
    ...driveMemories.map((m): [string, RemoteMemory] => [`drive:${m.driveFileId}`, m]),
  ]);

  const merged: Memory[] = local.map((memory) => {
    const key = memory.storageId ? `sb:${memory.storageId}` : memory.driveFileId ? `drive:${memory.driveFileId}` : null;
    const remote = key ? remoteByKey.get(key) : undefined;
    if (!remote) return memory;
    remoteByKey.delete(key as string);
    // Conservamos las fotos locales (base64, ya disponibles al instante en este dispositivo)
    // y solo tomamos del remoto los campos que no tenemos en caché local.
    return {
      ...remote,
      id: memory.id,
      imageBase64: memory.imageBase64,
      images: memory.images ?? remote.images,
      coverIndex: memory.coverIndex ?? remote.coverIndex,
    } as Memory;
  });

  const all = [...merged, ...remoteByKey.values()];
  all.sort(
    (a, b) => (b.date || '').localeCompare(a.date || '') || (b.timestamp || 0) - (a.timestamp || 0)
  );
  return all;
}
