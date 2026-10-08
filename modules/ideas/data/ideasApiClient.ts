import type { IdeaItem, IdeaPayload } from '@/types/ideas';

export interface IdeasListResponse {
  connected: boolean;
  ideas: IdeaItem[];
  message?: string;
  error?: string;
}

export async function fetchCloudIdeas(): Promise<IdeasListResponse> {
  try {
    const res = await fetch('/api/ideas');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as IdeasListResponse;
  } catch {
    return { connected: false, ideas: [] };
  }
}

export async function addCloudIdea(payload: IdeaPayload): Promise<IdeaItem | null> {
  try {
    const res = await fetch('/api/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { idea?: IdeaItem };
    return data.idea ?? null;
  } catch {
    return null;
  }
}

export async function updateCloudIdea(id: number, payload: IdeaPayload): Promise<IdeaItem | null> {
  try {
    const res = await fetch('/api/ideas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...payload }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { idea?: IdeaItem };
    return data.idea ?? null;
  } catch {
    return null;
  }
}

export async function deleteCloudIdea(id: number): Promise<boolean> {
  try {
    const res = await fetch(`/api/ideas?id=${id}`, { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}
