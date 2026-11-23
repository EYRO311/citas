export interface LocalMemory {
  id: string;
  title: string;
  date: string;
  location: string;
  caption: string;
  /** 'photo' si falta, por compatibilidad con recuerdos viejos que no tienen este campo. */
  kind?: 'photo' | 'video';
  /** Todas las fotos de este recuerdo (base64), en el orden en que se subieron. */
  images?: string[];
  /** Índice dentro de `images` que se usa como portada. */
  coverIndex?: number;
  /** Portada resuelta (= images[coverIndex]); se mantiene por compatibilidad con recuerdos antiguos de una sola foto. */
  imageBase64?: string;
  imageUrl?: string;
  driveUrl?: string | null;
  driveFileId?: string | null;
  storageId?: string;
  /** Solo para kind: 'video'. ID del archivo en Google Drive y URL de nuestro proxy de streaming. */
  videoDriveId?: string;
  videoUrl?: string;
  durationSec?: number;
  isLocal: boolean;
  timestamp: number;
}

export interface RemoteMemory {
  id: string;
  title: string;
  date: string;
  location: string;
  caption: string;
  /** 'photo' si falta, por compatibilidad con recuerdos viejos que no tienen este campo. */
  kind?: 'photo' | 'video';
  /** URLs públicas de todas las fotos del recuerdo, en orden. */
  images?: string[];
  /** Índice dentro de `images` que se usa como portada. */
  coverIndex?: number;
  thumbUrl?: string;
  imageUrl?: string;
  driveUrl?: string;
  driveFileId?: string;
  storageId?: string;
  /** Solo para kind: 'video'. ID del archivo en Google Drive (carpeta privada) y URL de nuestro proxy de streaming. */
  videoDriveId?: string;
  videoUrl?: string;
  durationSec?: number;
  source: 'supabase' | 'drive';
  timestamp: number;
}

export type Memory = LocalMemory | RemoteMemory;

/**
 * Orden en el que se muestran los recuerdos en el libro:
 * - 'date': por la fecha que se puso al recuerdo (de más antigua a más reciente).
 * - 'manual': el orden exacto que se acomodó a mano en el admin.
 * - 'created': por la fecha en la que se subió/creó el recuerdo.
 */
export type MemoriesSortMode = 'date' | 'manual' | 'created';

export interface MemoriesSettings {
  sortMode: MemoriesSortMode;
  /** Claves estables (ver `memoryKey`) en el orden elegido a mano, de primera a última página. */
  manualOrder: string[];
}

export interface MemoriesSettingsResponse {
  connected: boolean;
  settings: MemoriesSettings;
  message?: string;
  error?: string;
}

export interface MemoryMeta {
  title: string;
  date: string;
  location: string;
  caption: string;
}

export interface MemoriesListResponse {
  connected: boolean;
  memories: RemoteMemory[];
  message?: string;
  error?: string;
}

export interface UploadImageInput {
  base64: string;
  mimeType?: string;
  name?: string;
}

/** Una foto al editar un recuerdo: una que ya estaba (por su URL pública) o una nueva (base64). */
export type EditPhotoInput = { url: string } | UploadImageInput;

export interface MemoryPhotosChange {
  /** Lista final de fotos, en orden. Las que no aparezcan se borran del bucket. */
  photos: EditPhotoInput[];
  coverIndex?: number;
}

export interface UploadRequestBody {
  images: UploadImageInput[];
  coverIndex?: number;
  title?: string;
  date?: string;
  location?: string;
  caption?: string;
  webhookUrl?: string;
  folderId?: string;
}

export interface UploadResponse {
  success: boolean;
  mode?: 'supabase' | 'webhook' | 'service_account' | 'local';
  storageId?: string;
  imageUrl?: string;
  images?: string[];
  coverIndex?: number;
  driveFileId?: string | null;
  driveUrl?: string | null;
  downloadUrl?: string;
  message?: string;
  error?: string;
}

// ==============================================================================
// Recuerdos en video: el archivo pesado va directo del navegador a Google Drive
// (sesión resumable iniciada por nuestro servidor); Supabase solo guarda el
// metadata + una miniatura, igual que un recuerdo de foto normal.
// ==============================================================================

export const MAX_VIDEO_BYTES = 500 * 1024 * 1024; // 500MB
export const MAX_VIDEO_DURATION_SEC = 5 * 60; // 5 minutos
export const VIDEO_UPLOAD_CHUNK_BYTES = 8 * 1024 * 1024; // 8MB por chunk

export interface VideoSessionRequestBody {
  name: string;
  mimeType: string;
  size: number;
}

export interface VideoSessionResponse {
  success: boolean;
  /** URI de sesión resumable de Drive; única credencial que toca el navegador. */
  uploadUrl?: string;
  error?: string;
}

export interface VideoSessionAvailability {
  available: boolean;
  message?: string;
}

export interface VideoFinishRequestBody {
  kind: 'video';
  driveFileId: string;
  title?: string;
  date?: string;
  location?: string;
  caption?: string;
  durationSec?: number;
  /** Miniatura (poster frame), igual formato que las fotos (data URL base64). */
  thumbnail: UploadImageInput;
}

export interface VideoFinishResponse {
  success: boolean;
  memory?: RemoteMemory;
  error?: string;
}
