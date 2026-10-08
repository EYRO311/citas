'use client';

import { useCallback, useEffect, useState } from 'react';
import type { IdeaItem } from '@/types/ideas';
import { loadIdeas } from '../data/ideasService';

export function useIdeas() {
  const [ideas, setIdeas] = useState<IdeaItem[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const result = await loadIdeas();
    setIdeas(result.ideas);
    setConnected(result.connected);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('ideas_updated', refresh);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('ideas_updated', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  return { ideas, connected, loading, refresh };
}
