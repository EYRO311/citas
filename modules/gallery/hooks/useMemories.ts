'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Memory } from '@/types/memories';
import { getMemories } from '../data/memoriesLocalRepository';
import { fetchCloudMemories, fetchDriveStatus } from '../data/memoriesApiClient';
import { mergeMemories } from '../domain/mergeMemories';

// Misma fuente de datos que usa <Gallery />, expuesta como hook para poder
// reutilizarla en otras vistas (por ejemplo, el modo libro).
export function useMemories() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [local, cloud, drive] = await Promise.all([getMemories(), fetchCloudMemories(), fetchDriveStatus()]);
    setMemories(mergeMemories(local, cloud.memories, drive.memories));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  return { memories, loading, refresh };
}
