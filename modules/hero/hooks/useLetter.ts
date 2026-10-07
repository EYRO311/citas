'use client';

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_LETTER, getLetter } from '../data/letterRepository';
import type { LetterContent } from '@/types/letter';

export function useLetter() {
  const [letter, setLetter] = useState<LetterContent>(DEFAULT_LETTER);

  const refresh = useCallback(() => {
    setLetter(getLetter());
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('letter_updated', refresh);
    return () => {
      window.removeEventListener('letter_updated', refresh);
    };
  }, [refresh]);

  return { letter, refresh };
}
