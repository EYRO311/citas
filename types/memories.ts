export interface LocalMemory {
  id: string;
  title: string;
  date: string;
  location: string;
  caption: string;
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
  isLocal: boolean;
  timestamp: number;
}

export interface RemoteMemory {
  id: string;
  title: string;
  date: string;
  location: string;
  caption: string;
  /** URLs públicas de todas las fotos del recuerdo, en orden. */
  images?: string[];
  /** Índice dentro de `images` que se usa como portada. */
  coverIndex?: number;
  thumbUrl?: string;
  imageUrl?: string;
  driveUrl?: string;
  driveFileId?: string;
  storageId?: string;
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
