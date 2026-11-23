import type { DriveStatusResponse } from '@/types/drive';
import type {
  MemoriesListResponse,
  MemoriesSettings,
  MemoriesSettingsResponse,
  MemoryMeta,
  MemoryPhotosChange,
  RemoteMemory,
  UploadRequestBody,
  UploadResponse,
  VideoFinishRequestBody,
  VideoFinishResponse,
  VideoSessionAvailability,
  VideoSessionResponse,
} from '@/types/memories';
import { VIDEO_UPLOAD_CHUNK_BYTES } from '@/types/memories';

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

export async function updateCloudMemory(
  storageId: string,
  meta: Partial<MemoryMeta>,
  photosChange?: MemoryPhotosChange
): Promise<RemoteMemory | null> {
  try {
    const res = await fetch('/api/memories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: storageId, ...meta, ...photosChange }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { memory?: RemoteMemory };
    return data.memory ?? null;
  } catch {
    return null;
  }
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

export async function fetchMemoriesSettings(): Promise<MemoriesSettingsResponse> {
  try {
    const res = await fetch('/api/memories/settings');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as MemoriesSettingsResponse;
  } catch {
    return { connected: false, settings: { sortMode: 'date', manualOrder: [] } };
  }
}

export async function saveMemoriesSettings(settings: MemoriesSettings): Promise<boolean> {
  try {
    const res = await fetch('/api/memories/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return res.ok;
  } catch {
    return false;
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

// ==============================================================================
// Recuerdos en video: el archivo pesado sube directo del navegador a Drive con
// una sesión resumable; esta capa habla con nuestro servidor solo para abrir esa
// sesión y, al final, guardar el metadata + miniatura en Supabase.
// ==============================================================================

export async function checkVideoUploadAvailable(): Promise<VideoSessionAvailability> {
  try {
    const res = await fetch('/api/memories/video-session');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as VideoSessionAvailability;
  } catch {
    return { available: false, message: 'No se pudo verificar la subida de video.' };
  }
}

async function requestVideoSession(name: string, mimeType: string, size: number): Promise<string> {
  const res = await fetch('/api/memories/video-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType, size }),
  });
  const data = (await res.json()) as VideoSessionResponse;
  if (!res.ok || !data.success || !data.uploadUrl) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data.uploadUrl;
}

function putChunk(
  uploadUrl: string,
  chunk: Blob,
  start: number,
  end: number,
  total: number,
  onProgress?: (sentBytes: number, totalBytes: number) => void
): Promise<{ done: boolean; fileId?: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Range', `bytes ${start}-${end - 1}/${total}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(start + e.loaded, total);
    };
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve({ done: true, fileId: data.id });
        } catch {
          reject(new Error('Respuesta inválida de Drive al terminar la subida'));
        }
      } else if (xhr.status === 308) {
        resolve({ done: false });
      } else {
        reject(new Error(`Drive respondió ${xhr.status} al subir el video`));
      }
    };
    xhr.onerror = () => reject(new Error('Error de red subiendo el video'));
    xhr.send(chunk);
  });
}

async function putChunkWithRetry(
  uploadUrl: string,
  chunk: Blob,
  start: number,
  end: number,
  total: number,
  onProgress?: (sentBytes: number, totalBytes: number) => void,
  attempt = 1
): Promise<{ done: boolean; fileId?: string }> {
  try {
    return await putChunk(uploadUrl, chunk, start, end, total, onProgress);
  } catch (err) {
    if (attempt >= 3) throw err;
    await new Promise((r) => setTimeout(r, 800 * attempt));
    return putChunkWithRetry(uploadUrl, chunk, start, end, total, onProgress, attempt + 1);
  }
}

/** Sube el archivo en chunks directo a la sesión resumable de Drive y devuelve el ID del archivo creado. */
async function uploadVideoToDrive(
  uploadUrl: string,
  file: Blob,
  onProgress?: (sentBytes: number, totalBytes: number) => void
): Promise<string> {
  const total = file.size;
  let start = 0;
  while (start < total) {
    const end = Math.min(start + VIDEO_UPLOAD_CHUNK_BYTES, total);
    const chunk = file.slice(start, end);
    const result = await putChunkWithRetry(uploadUrl, chunk, start, end, total, onProgress);
    if (result.done && result.fileId) {
      onProgress?.(total, total);
      return result.fileId;
    }
    start = end;
  }
  throw new Error('La subida terminó sin confirmación de Drive');
}

/** Flujo completo: abre sesión, sube el archivo y guarda el recuerdo. */
export async function uploadVideoMemory(
  file: File,
  meta: Omit<VideoFinishRequestBody, 'kind' | 'driveFileId' | 'thumbnail'>,
  thumbnail: VideoFinishRequestBody['thumbnail'],
  onProgress?: (sentBytes: number, totalBytes: number) => void
): Promise<RemoteMemory> {
  const uploadUrl = await requestVideoSession(file.name, file.type, file.size);
  const driveFileId = await uploadVideoToDrive(uploadUrl, file, onProgress);

  const res = await fetch('/api/memories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'video', driveFileId, thumbnail, ...meta }),
  });
  const data = (await res.json()) as VideoFinishResponse;
  if (!res.ok || !data.success || !data.memory) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data.memory;
}
