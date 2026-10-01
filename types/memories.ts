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
