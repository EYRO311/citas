'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { NOTES_MAX_LENGTH, type BookNotes } from '@/types/notes';

const LOCAL_KEY = 'propuesta_book_notes';
const SAVE_DELAY_MS = 900;

export type NotesStatus = 'loading' | 'idle' | 'saving' | 'saved' | 'local';

function readLocal(): string {
  try {
    return localStorage.getItem(LOCAL_KEY) || '';
  } catch {
    return '';
  }
}

function writeLocal(text: string) {
  try {
    localStorage.setItem(LOCAL_KEY, text);
  } catch {
    // almacenamiento no disponible
  }
}

async function putNotes(text: string, keepalive = false): Promise<boolean> {
  try {
    const res = await fetch('/api/notes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      keepalive,
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Notas de la página principal de "Notas" del libro. Se guardan solas mientras se
// escribe (en Supabase; si no hay nube, en este navegador).
export function useBookNotes() {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<NotesStatus>('loading');
  const pending = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/notes');
        const data = (await res.json()) as { connected: boolean; notes: BookNotes };
        if (cancelled) return;
        if (data.connected) {
          setText(data.notes.text);
          setStatus('idle');
          return;
        }
      } catch {
        // sin conexión: usamos la copia local
      }
      if (!cancelled) {
        setText(readLocal());
        setStatus('local');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const flush = useCallback(async (keepalive = false) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const value = pending.current;
    if (value === null) return;
    pending.current = null;
    writeLocal(value);
    const ok = await putNotes(value, keepalive);
    setStatus(ok ? 'saved' : 'local');
  }, []);

  const update = useCallback(
    (next: string) => {
      const value = next.slice(0, NOTES_MAX_LENGTH);
      setText(value);
      setStatus('saving');
      pending.current = value;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => flush(), SAVE_DELAY_MS);
    },
    [flush]
  );

  // Si se cierra o se cambia de pestaña antes de que pase la espera, guardar ya.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush(true);
    };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      flush(true);
    };
  }, [flush]);

  return { text, status, update, maxLength: NOTES_MAX_LENGTH };
}
