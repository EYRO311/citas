'use client';

import { useCallback, useEffect, useState } from 'react';
import { getEvents } from '../data/eventsRepository';
import type { EventItem } from '@/types/events';

export function useEvents() {
  const [events, setEvents] = useState<EventItem[]>([]);

  const refresh = useCallback(() => {
    setEvents(getEvents());
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('events_updated', refresh);
    window.addEventListener('secret_unlocked', refresh);
    window.addEventListener('secret_locked', refresh);
    return () => {
      window.removeEventListener('events_updated', refresh);
      window.removeEventListener('secret_unlocked', refresh);
      window.removeEventListener('secret_locked', refresh);
    };
  }, [refresh]);

  return { events, refresh };
}
