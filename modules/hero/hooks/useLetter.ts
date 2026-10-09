'use client';

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_LETTER } from '../data/letterRepository';
import { loadLetter } from '../data/letterService';
import type { LetterContent } from '@/types/letter';

export function useLetter() {
  const [letter, setLetter] = useState<LetterContent>(DEFAULT_LETTER);
  const [connected, setConnected] = useState(false);

  const refresh = useCallback(async () => {
    const result = await loadLetter();
    setLetter(result.letter);
    setConnected(result.connected);
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('letter_updated', refresh);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('letter_updated', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  return { letter, connected, refresh };
}
