import { google } from 'googleapis';
import type { drive_v3 } from 'googleapis';
import type { DriveConfig } from '@/types/drive';
import type { RemoteMemory } from '@/types/memories';

// ==============================================================================
// Listado de fotos de la carpeta de Google Drive como "recuerdos", y proxy de
// imagen para el modo cuenta de servicio (carpeta privada).
// ==============================================================================

export const LIST_FIELDS =
  'nextPageToken, files(id, name, description, createdTime, webViewLink, imageMediaMetadata(time), appProperties)';
const MAX_PAGES = 5;

export function getDriveConfig(url: URL): DriveConfig {
  return {
    clientEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    privateKey: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    folderId: url.searchParams.get('folderId') || process.env.GOOGLE_DRIVE_FOLDER_ID,
    apiKey: url.searchParams.get('apiKey') || process.env.GOOGLE_API_KEY,
    webhookUrl: url.searchParams.get('webhookUrl') || process.env.GOOGLE_DRIVE_WEBHOOK_URL,
  };
}

export function hasServiceAccount(cfg: DriveConfig): boolean {
  return Boolean(cfg.clientEmail && cfg.privateKey && cfg.folderId);
}

function getServiceAccountAuth(cfg: DriveConfig) {
  return new google.auth.JWT({
    email: cfg.clientEmail,
    key: cfg.privateKey,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
}

const publicImageUrl = (id: string, size: number) => `https://lh3.googleusercontent.com/d/${id}=s${size}`;
const proxyImageUrl = (id: string, size: number) => `/api/drive?id=${encodeURIComponent(id)}&size=${size}`;

function readMeta(file: drive_v3.Schema$File): { title?: string; location?: string; caption?: string; date?: string } {
  const props = file.appProperties || {};
  const desc = (file.description || '').trim();
  if (props.title || props.location) return { ...props, caption: desc };

  if (desc.startsWith('{')) {
    try {
      return JSON.parse(desc);
    } catch {
      // fall through
    }
  }
  return { caption: desc };
}

function exifDateToIso(exif?: string | null): string {
  const match = /^(\d{4}):(\d{2}):(\d{2})/.exec(exif || '');
  return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
}

function titleFromName(name = ''): string {
  const base = name.replace(/\.[^.]+$/, '');
  if (
    !base ||
    /^(img|pxl|dsc|dcim|photo|whatsapp image|screenshot|captura|recuerdo|salida)[\s_-]?\d*/i.test(base) ||
    /^\d[\d_\s-]*$/.test(base)
  ) {
    return 'Recuerdo de nuestra salida';
  }
  return base.replace(/[_-]+/g, ' ').trim();
}

function toMemory(file: drive_v3.Schema$File, imageUrlFor: (id: string, size: number) => string): RemoteMemory {
  const meta = readMeta(file);
  const createdIso = file.createdTime ? new Date(file.createdTime).toISOString() : '';
  const id = file.id || '';

  return {
    id: `drive_${id}`,
    driveFileId: id,
    title: meta.title || titleFromName(file.name || ''),
    date: meta.date || exifDateToIso(file.imageMediaMetadata?.time) || createdIso.slice(0, 10),
    location: meta.location || '',
    caption: meta.caption || '',
    thumbUrl: imageUrlFor(id, 800),
    imageUrl: imageUrlFor(id, 2000),
    driveUrl: file.webViewLink || `https://drive.google.com/file/d/${id}/view`,
    source: 'drive',
    timestamp: file.createdTime ? Date.parse(file.createdTime) || 0 : 0,
  };
}

function imagesInFolderQuery(folderId: string) {
  return `'${folderId}' in parents and trashed = false and mimeType contains 'image/'`;
}

async function listWithServiceAccount(cfg: DriveConfig): Promise<RemoteMemory[]> {
  const drive = google.drive({ version: 'v3', auth: getServiceAccountAuth(cfg) });
  const files: drive_v3.Schema$File[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const { data } = await drive.files.list({
      q: imagesInFolderQuery(cfg.folderId as string),
      fields: LIST_FIELDS,
      pageSize: 100,
      orderBy: 'createdTime desc',
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    files.push(...(data.files || []));
    pageToken = data.nextPageToken || undefined;
    if (!pageToken) break;
  }

  return files.map((f) => toMemory(f, proxyImageUrl));
}

async function listWithApiKey(cfg: DriveConfig): Promise<RemoteMemory[]> {
  const files: drive_v3.Schema$File[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', imagesInFolderQuery(cfg.folderId as string));
    url.searchParams.set('fields', LIST_FIELDS);
    url.searchParams.set('pageSize', '100');
    url.searchParams.set('orderBy', 'createdTime desc');
    url.searchParams.set('key', cfg.apiKey as string);
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Drive API respondió ${res.status}: ${await res.text()}`);
    const data = await res.json();
    files.push(...(data.files || []));
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  return files.map((f) => toMemory(f, publicImageUrl));
}

async function listWithWebhook(cfg: DriveConfig): Promise<RemoteMemory[]> {
  const url = new URL(cfg.webhookUrl as string);
  url.searchParams.set('action', 'list');

  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Apps Script respondió ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);

  return (data.files || []).map((f: drive_v3.Schema$File) => toMemory(f, publicImageUrl));
}

export interface DriveListResult {
  mode: 'service_account' | 'webhook' | 'api_key' | null;
  memories: RemoteMemory[];
}

export async function listDriveMemories(cfg: DriveConfig): Promise<DriveListResult> {
  if (hasServiceAccount(cfg)) {
    return { mode: 'service_account', memories: await listWithServiceAccount(cfg) };
  }
  if (cfg.webhookUrl) {
    return { mode: 'webhook', memories: await listWithWebhook(cfg) };
  }
  if (cfg.apiKey && cfg.folderId) {
    return { mode: 'api_key', memories: await listWithApiKey(cfg) };
  }
  return { mode: null, memories: [] };
}

export interface ProxiedImage {
  buffer: Buffer;
  contentType: string;
}

export async function getProxiedDriveImage(cfg: DriveConfig, fileId: string, size: number): Promise<ProxiedImage> {
  if (!hasServiceAccount(cfg)) {
    throw new Error('El proxy de imágenes solo está disponible con cuenta de servicio');
  }
  if (!/^[\w-]+$/.test(fileId)) {
    throw new Error('ID de archivo inválido');
  }

  const auth = getServiceAccountAuth(cfg);
  const drive = google.drive({ version: 'v3', auth });

  const { data: file } = await drive.files.get({
    fileId,
    fields: 'parents, mimeType, thumbnailLink',
    supportsAllDrives: true,
  });

  if (!file.parents || !file.parents.includes(cfg.folderId as string)) {
    throw new Error('Archivo no encontrado');
  }

  if (file.thumbnailLink) {
    try {
      const { token } = await auth.getAccessToken();
      const thumbRes = await fetch(file.thumbnailLink.replace(/=s\d+$/, `=s${size}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (thumbRes.ok) {
        const buffer = Buffer.from(await thumbRes.arrayBuffer());
        return { buffer, contentType: thumbRes.headers.get('content-type') || 'image/jpeg' };
      }
    } catch (err) {
      console.warn('Miniatura no disponible, usando archivo original:', (err as Error).message);
    }
  }

  const media = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'arraybuffer' }
  );
  return { buffer: Buffer.from(media.data as ArrayBuffer), contentType: file.mimeType || 'image/jpeg' };
}
