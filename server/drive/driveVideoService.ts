import { google } from 'googleapis';
import type { DriveConfig } from '@/types/drive';

// ==============================================================================
// Recuerdos en video: el archivo pesado se sube directo del navegador a Google
// Drive (sesión resumable iniciada acá con la Service Account) y se reproduce
// vía streaming a través de nuestro proxy, sin que la carpeta tenga que ser
// pública. La clave de la Service Account nunca sale del servidor: lo único
// que llega al navegador es la URL de sesión resumable (de un solo uso, atada
// a este archivo).
// ==============================================================================

const DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive'];

function getAuth(cfg: DriveConfig) {
  return new google.auth.JWT({
    email: cfg.clientEmail,
    key: cfg.privateKey,
    scopes: DRIVE_SCOPES,
  });
}

function assertServiceAccount(cfg: DriveConfig) {
  if (!cfg.clientEmail || !cfg.privateKey || !cfg.folderId) {
    throw new Error(
      'Google Drive (Service Account) no está configurado: faltan GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY o GOOGLE_DRIVE_FOLDER_ID'
    );
  }
}

export interface CreateSessionInput {
  name: string;
  mimeType: string;
  size: number;
}

export async function createResumableSession(cfg: DriveConfig, input: CreateSessionInput): Promise<string> {
  assertServiceAccount(cfg);

  const auth = getAuth(cfg);
  const { token } = await auth.getAccessToken();
  if (!token) throw new Error('No se pudo autenticar con la cuenta de servicio de Google');

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': input.mimeType,
        'X-Upload-Content-Length': String(input.size),
      },
      body: JSON.stringify({ name: input.name, parents: [cfg.folderId] }),
    }
  );

  if (!res.ok) {
    throw new Error(`Drive respondió ${res.status} al iniciar la sesión resumable: ${await res.text()}`);
  }

  const location = res.headers.get('location');
  if (!location) throw new Error('Drive no devolvió la URL de sesión resumable');
  return location;
}

function headerValue(headers: unknown, key: string): string | undefined {
  if (!headers) return undefined;
  if (headers instanceof Headers) return headers.get(key) || undefined;
  const record = headers as Record<string, string | string[] | undefined>;
  const value = record[key] ?? record[key.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

export interface DriveVideoStream {
  status: number;
  contentType: string;
  contentRange?: string;
  contentLength?: string;
  stream: NodeJS.ReadableStream;
}

export async function streamDriveVideo(
  cfg: DriveConfig,
  fileId: string,
  rangeHeader?: string | null
): Promise<DriveVideoStream> {
  assertServiceAccount(cfg);
  if (!/^[\w-]+$/.test(fileId)) {
    throw new Error('ID de archivo inválido');
  }

  const auth = getAuth(cfg);
  const drive = google.drive({ version: 'v3', auth });

  const { data: file } = await drive.files.get({
    fileId,
    fields: 'parents, mimeType',
    supportsAllDrives: true,
  });
  if (!file.parents || !file.parents.includes(cfg.folderId as string)) {
    throw new Error('Archivo no encontrado');
  }

  const response = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'stream', headers: rangeHeader ? { Range: rangeHeader } : undefined }
  );

  return {
    status: response.status,
    contentType: file.mimeType || 'video/mp4',
    contentRange: headerValue(response.headers, 'content-range'),
    contentLength: headerValue(response.headers, 'content-length'),
    stream: response.data as unknown as NodeJS.ReadableStream,
  };
}
