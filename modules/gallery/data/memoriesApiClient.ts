import type { DriveStatusResponse } from '@/types/drive';
import type { MemoriesListResponse, UploadRequestBody, UploadResponse } from '@/types/memories';

export async function fetchCloudMemories(): Promise<MemoriesListResponse> {
  try {
    const res = await fetch('/api/memories');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as MemoriesListResponse;
  } catch {
    return { connected: false, memories: [] };
  }
}

export async function deleteCloudMemory(storageId: string): Promise<boolean> {
  const res = await fetch(`/api/memories?id=${encodeURIComponent(storageId)}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) return false;
  return true;
}

export async function fetchDriveStatus(): Promise<DriveStatusResponse> {
  try {
    const webhook = (localStorage.getItem('propuesta_drive_webhook_url') || '').trim();
    const folderId = (localStorage.getItem('propuesta_drive_folder_id') || '').trim();
    const params = new URLSearchParams();
    if (webhook) params.set('webhookUrl', webhook);
    if (folderId) params.set('folderId', folderId);
    const url = '/api/drive' + (params.toString() ? `?${params.toString()}` : '');

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as DriveStatusResponse;
  } catch {
    return { connected: false, mode: 'local', memories: [] };
  }
}

export async function uploadMemoryToCloud(body: UploadRequestBody): Promise<UploadResponse> {
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as UploadResponse;
}
