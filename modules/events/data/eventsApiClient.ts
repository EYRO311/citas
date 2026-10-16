import type { EventItem, EventPayload } from '@/types/events';

export interface EventsGetResponse {
  connected: boolean;
  events: EventItem[];
  message?: string;
  error?: string;
}

export async function fetchCloudEvents(): Promise<EventsGetResponse> {
  try {
    const res = await fetch('/api/events');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as EventsGetResponse;
  } catch {
    return { connected: false, events: [] };
  }
}

export async function createCloudEvent(payload: EventPayload): Promise<EventItem | null> {
  try {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.event || null;
  } catch {
    return null;
  }
}

export async function updateCloudEvent(id: number, payload: Partial<EventItem>): Promise<EventItem | null> {
  try {
    const res = await fetch('/api/events', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...payload }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.event || null;
  } catch {
    return null;
  }
}

export async function deleteCloudEvent(id: number): Promise<boolean> {
  try {
    const res = await fetch(`/api/events?id=${id}`, { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function updateCloudRSVP(id: number, accepted: boolean): Promise<EventItem | null> {
  try {
    const res = await fetch('/api/events', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, accepted }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.event || null;
  } catch {
    return null;
  }
}
