'use client';

import { useCallback, useEffect, useState } from 'react';
import { getEvents } from '../data/eventsRepository';
import { loadEvents } from '../data/eventsService';
import type { EventItem } from '@/types/events';

export function useEvents() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [cloudConnected, setCloudConnected] = useState<boolean>(false);

  const refresh = useCallback(async () => {
    setEvents(getEvents());
    try {
      const res = await loadEvents();
      setEvents(res.events);
      setCloudConnected(res.connected);
    } catch {
      // mantener cache local si falla la red
    }
  }, []);

  useEffect(() => {
    // 1. Primer render rápido desde el cache local
    setEvents(getEvents());

    // 2. Cargar datos frescos de Supabase
    loadEvents().then((res) => {
      setEvents(res.events);
      setCloudConnected(res.connected);
    });

    const handleLocalUpdate = () => {
      setEvents(getEvents());
    };

    window.addEventListener('events_updated', handleLocalUpdate);
    window.addEventListener('secret_unlocked', handleLocalUpdate);
    window.addEventListener('secret_locked', handleLocalUpdate);

    return () => {
      window.removeEventListener('events_updated', handleLocalUpdate);
      window.removeEventListener('secret_unlocked', handleLocalUpdate);
      window.removeEventListener('secret_locked', handleLocalUpdate);
    };
  }, []);

  return { events, refresh, cloudConnected };
}
