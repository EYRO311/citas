import { google } from 'googleapis';

// ==============================================================================
// GET /api/drive            → lista las fotos de la carpeta de Drive como "recuerdos"
// GET /api/drive?id=X&size= → sirve la imagen X (solo modo cuenta de servicio)
//
// Cualquier foto que se suba a la carpeta (desde la app, la app de Drive del
// celular o drive.google.com) aparece en el álbum automáticamente.
// ==============================================================================

const LIST_FIELDS = 'nextPageToken, files(id, name, description, createdTime, webViewLink, imageMediaMetadata(time), appProperties)';
const MAX_PAGES = 5;

function getConfig(req) {
  let query = {};
  if (req?.url) {
    try {
      const urlObj = new URL(req.url, 'http://localhost');
      query = Object.fromEntries(urlObj.searchParams);
    } catch {}
  }
  return {
    clientEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    privateKey: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    folderId: query.folderId || process.env.GOOGLE_DRIVE_FOLDER_ID,
    apiKey: query.apiKey || process.env.GOOGLE_API_KEY,
    webhookUrl: query.webhookUrl || process.env.GOOGLE_DRIVE_WEBHOOK_URL
  };
}

function hasServiceAccount(cfg) {
  return Boolean(cfg.clientEmail && cfg.privateKey && cfg.folderId);
}

function getServiceAccountAuth(cfg) {
  return new google.auth.JWT({
    email: cfg.clientEmail,
    key: cfg.privateKey,
    scopes: ['https://www.googleapis.com/auth/drive.readonly']
  });
}

function sendJson(res, status, body, cacheControl = 'no-store') {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', cacheControl);
  return res.end(JSON.stringify(body));
}

// URL pública de una imagen compartida "cualquier persona con el enlace"
const publicImageUrl = (id, size) => `https://lh3.googleusercontent.com/d/${id}=s${size}`;
const proxyImageUrl = (id, size) => `/api/drive?id=${encodeURIComponent(id)}&size=${size}`;

// ------------------------------------------------------------------------------
// Normalización: archivo de Drive → recuerdo de la galería
// ------------------------------------------------------------------------------

// Metadatos del recuerdo: appProperties + descripción como mensaje (subidas por
// cuenta de servicio), JSON en la descripción (subidas por Apps Script) o la
// descripción escrita a mano en Drive como mensaje.
function readMeta(file) {
  const props = file.appProperties || {};
  const desc = (file.description || '').trim();
  if (props.title || props.location) return { ...props, caption: desc };

  if (desc.startsWith('{')) {
    try {
      return JSON.parse(desc);
    } catch {}
  }
  return { caption: desc };
}

// "2026:09:15 18:22:10" (EXIF) → "2026-09-15"
function exifDateToIso(exif) {
  const match = /^(\d{4}):(\d{2}):(\d{2})/.exec(exif || '');
  return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
}

// Nombres de cámara (IMG_2026..., PXL_..., WhatsApp Image...) no son buenos títulos
function titleFromName(name = '') {
  const base = name.replace(/\.[^.]+$/, '');
  if (!base || /^(img|pxl|dsc|dcim|photo|whatsapp image|screenshot|captura|recuerdo|salida)[\s_-]?\d*/i.test(base) || /^\d[\d_\s-]*$/.test(base)) {
    return 'Recuerdo de nuestra salida';
  }
  return base.replace(/[_-]+/g, ' ').trim();
}

function toMemory(file, imageUrlFor) {
  const meta = readMeta(file);
  const createdIso = file.createdTime ? new Date(file.createdTime).toISOString() : '';

  return {
    id: `drive_${file.id}`,
    driveFileId: file.id,
    title: meta.title || titleFromName(file.name),
    date: meta.date || exifDateToIso(file.imageMediaMetadata?.time) || createdIso.slice(0, 10),
    location: meta.location || '',
    caption: meta.caption || '',
    thumbUrl: imageUrlFor(file.id, 800),
    imageUrl: imageUrlFor(file.id, 2000),
    driveUrl: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
    source: 'drive',
    timestamp: Date.parse(file.createdTime) || 0
  };
}

// ------------------------------------------------------------------------------
// Listado según el modo configurado
// ------------------------------------------------------------------------------

function imagesInFolderQuery(folderId) {
  return `'${folderId}' in parents and trashed = false and mimeType contains 'image/'`;
}

async function listWithServiceAccount(cfg) {
  const drive = google.drive({ version: 'v3', auth: getServiceAccountAuth(cfg) });
  const files = [];
  let pageToken;

  for (let page = 0; page < MAX_PAGES; page++) {
    const { data } = await drive.files.list({
      q: imagesInFolderQuery(cfg.folderId),
      fields: LIST_FIELDS,
      pageSize: 100,
      orderBy: 'createdTime desc',
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });
    files.push(...(data.files || []));
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  return files.map(f => toMemory(f, proxyImageUrl));
}

// Carpeta compartida "cualquier persona con el enlace" + API key (sin cuenta de servicio)
async function listWithApiKey(cfg) {
  const files = [];
  let pageToken;

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', imagesInFolderQuery(cfg.folderId));
    url.searchParams.set('fields', LIST_FIELDS);
    url.searchParams.set('pageSize', '100');
    url.searchParams.set('orderBy', 'createdTime desc');
    url.searchParams.set('key', cfg.apiKey);
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Drive API respondió ${res.status}: ${await res.text()}`);
    const data = await res.json();
    files.push(...(data.files || []));
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  return files.map(f => toMemory(f, publicImageUrl));
}

// Apps Script desplegado como App Web (ver google-apps-script/Code.gs)
async function listWithWebhook(cfg) {
  const url = new URL(cfg.webhookUrl);
  url.searchParams.set('action', 'list');

  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Apps Script respondió ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);

  return (data.files || []).map(f => toMemory(f, publicImageUrl));
}

// ------------------------------------------------------------------------------
// Proxy de imágenes (cuenta de servicio): permite que la carpeta sea privada
// ------------------------------------------------------------------------------
async function serveImage(res, cfg, fileId, size) {
  if (!hasServiceAccount(cfg)) {
    return sendJson(res, 404, { error: 'El proxy de imágenes solo está disponible con cuenta de servicio' });
  }
  if (!/^[\w-]+$/.test(fileId)) {
    return sendJson(res, 400, { error: 'ID de archivo inválido' });
  }

  const auth = getServiceAccountAuth(cfg);
  const drive = google.drive({ version: 'v3', auth });

  const { data: file } = await drive.files.get({
    fileId,
    fields: 'parents, mimeType, thumbnailLink',
    supportsAllDrives: true
  });

  // Solo servir archivos que viven en la carpeta del álbum
  if (!file.parents || !file.parents.includes(cfg.folderId)) {
    return sendJson(res, 404, { error: 'Archivo no encontrado' });
  }

  const sendImage = (buffer, contentType) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800');
    return res.end(buffer);
  };

  // 1. Miniatura redimensionada: ligera y por debajo del límite de respuesta de Vercel
  if (file.thumbnailLink) {
    try {
      const { token } = await auth.getAccessToken();
      const thumbRes = await fetch(file.thumbnailLink.replace(/=s\d+$/, `=s${size}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (thumbRes.ok) {
        const buffer = Buffer.from(await thumbRes.arrayBuffer());
        return sendImage(buffer, thumbRes.headers.get('content-type') || 'image/jpeg');
      }
    } catch (err) {
      console.warn('Miniatura no disponible, usando archivo original:', err.message);
    }
  }

  // 2. Archivo original (p. ej. recién subido, antes de que Drive genere la miniatura)
  const media = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'arraybuffer' }
  );
  return sendImage(Buffer.from(media.data), file.mimeType || 'image/jpeg');
}

// ------------------------------------------------------------------------------
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  const cfg = getConfig(req);
  const params = new URL(req.url, 'http://localhost').searchParams;
  const fileId = params.get('id');

  try {
    if (fileId) {
      const size = Math.min(Math.max(parseInt(params.get('size'), 10) || 1200, 200), 2400);
      return await serveImage(res, cfg, fileId, size);
    }

    let mode = null;
    let memories = [];

    if (hasServiceAccount(cfg)) {
      mode = 'service_account';
      memories = await listWithServiceAccount(cfg);
    } else if (cfg.webhookUrl) {
      mode = 'webhook';
      memories = await listWithWebhook(cfg);
    } else if (cfg.apiKey && cfg.folderId) {
      mode = 'api_key';
      memories = await listWithApiKey(cfg);
    }

    if (!mode) {
      return sendJson(res, 200, {
        connected: false,
        mode: 'local',
        memories: [],
        message: 'Modo local activo. Las fotos se guardan en el navegador. Configura Google Drive para ver las fotos de la carpeta aquí.'
      });
    }

    return sendJson(res, 200, {
      connected: true,
      mode,
      memories,
      message: `Google Drive conectado · ${memories.length} fotos`
    }, 'public, s-maxage=10, stale-while-revalidate=60');

  } catch (error) {
    console.error('Error consultando Google Drive:', error);
    // Devolver 200 con connected: false para no romper la app
    return sendJson(res, fileId ? 502 : 200, {
      connected: false,
      mode: 'local',
      memories: [],
      error: error.message
    });
  }
}
