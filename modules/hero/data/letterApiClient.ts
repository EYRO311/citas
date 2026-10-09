import type { LetterContent } from '@/types/letter';

export interface LetterGetResponse {
  connected: boolean;
  letter: LetterContent | null;
  message?: string;
  error?: string;
}

export async function fetchCloudLetter(): Promise<LetterGetResponse> {
  try {
    const res = await fetch('/api/letter');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as LetterGetResponse;
  } catch {
    return { connected: false, letter: null };
  }
}

export async function saveCloudLetter(letter: LetterContent): Promise<boolean> {
  try {
    const res = await fetch('/api/letter', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(letter),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteCloudLetter(): Promise<boolean> {
  try {
    const res = await fetch('/api/letter', { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}
