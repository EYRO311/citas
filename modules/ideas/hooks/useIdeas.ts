'use client';

import { useCallback, useEffect, useState } from 'react';
import { getIdeas } from '../data/ideasRepository';
import type { IdeaItem } from '@/types/ideas';

export function useIdeas() {
  const [ideas, setIdeas] = useState<IdeaItem[]>([]);

  const refresh = useCallback(() => {
    setIdeas(getIdeas());
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('ideas_updated', refresh);
    return () => {
      window.removeEventListener('ideas_updated', refresh);
    };
  }, [refresh]);

  return { ideas, refresh };
}
