'use client';

import { useCallback, useEffect, useState } from 'react';
import type { MemoriesSettings } from '@/types/memories';
import { fetchMemoriesSettings, saveMemoriesSettings as saveToCloud } from '../data/memoriesApiClient';

const LOCAL_KEY = 'propuesta_memories_settings';
const DEFAULT_SETTINGS: MemoriesSettings = { sortMode: 'date', manualOrder: [] };

function readLocal(): MemoriesSettings {
  try {
    const saved = localStorage.getItem(LOCAL_KEY);
    if (!saved) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(saved);
    return {
      sortMode: parsed.sortMode === 'manual' || parsed.sortMode === 'created' ? parsed.sortMode : 'date',
      manualOrder: Array.isArray(parsed.manualOrder) ? parsed.manualOrder.filter((x: unknown) => typeof x === 'string') : [],
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function writeLocal(settings: MemoriesSettings) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(settings));
  } catch {
    // almacenamiento no disponible
  }
}

// Orden en el que se muestran los recuerdos en el libro (ver tipos/memories.ts).
// Se guarda en Supabase; si no hay nube, se guarda solo en este navegador.
export function useMemoriesSettings() {
  const [settings, setSettings] = useState<MemoriesSettings>(DEFAULT_SETTINGS);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await fetchMemoriesSettings();
    setConnected(res.connected);
    setSettings(res.connected ? res.settings : readLocal());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const update = useCallback(
    async (next: MemoriesSettings) => {
      setSettings(next);
      writeLocal(next);
      if (connected) await saveToCloud(next);
      return next;
    },
    [connected]
  );

  return { settings, connected, loading, update, refresh };
}
