import { google } from 'googleapis';
import { Readable } from 'stream';
import { getSupabase, uploadMemory } from '@/server/supabase/memoriesService';
import type { UploadRequestBody, UploadResponse } from '@/types/memories';

// Drive limita cada appProperty a 124 bytes (clave + valor, UTF-8)
function fitAppProperty(key: string, value: string | undefined): string {
  let out = String(value || '');
  while (Buffer.byteLength(key + out, 'utf8') > 124) out = out.slice(0, -1);
  return out;
}

const stripDataUrl = (base64: string) => base64.replace(/^data:image\/\w+;base64,/, '');

export async function processMemoryUpload(body: UploadRequestBody): Promise<UploadResponse> {
  const { images, title, location, caption, date } = body || {};

  if (!images || images.length === 0) {
    return { success: false, error: 'No se recibió ninguna imagen (images es requerido)' };
  }

  const coverIndex = Math.min(Math.max(body.coverIndex || 0, 0), images.length - 1);
  const files = images.map((img) => ({
    buffer: Buffer.from(stripDataUrl(img.base64), 'base64'),
    mimeType: img.mimeType || 'image/jpeg',
  }));

  const meta = {
    title: title || '',
    date: date || new Date().toISOString().split('T')[0],
    location: location || '',
    caption: caption || '',
  };

  // 0. Supabase Storage (bucket "anuncios", prefijo propuesta/) si está configurado — soporta varias fotos
  const supabase = getSupabase();
  if (supabase) {
    try {
      const memory = await uploadMemory(supabase, { files, meta, coverIndex });
      return {
        success: true,
        mode: 'supabase',
        storageId: memory.storageId,
        imageUrl: memory.imageUrl,
        images: memory.images,
        coverIndex: memory.coverIndex,
        message:
          images.length > 1
            ? `¡${images.length} fotos guardadas en la nube! ☁️✨`
            : '¡Recuerdo guardado en la nube! ☁️✨',
      };
    } catch (supabaseErr) {
      console.warn('Error subiendo a Supabase, continuando con Google Drive:', supabaseErr);
    }
  }

  // A partir de aquí (Drive / local) solo se respalda la foto de portada:
  // el webhook de Apps Script y la cuenta de servicio solo aceptan una imagen por archivo.
  const cover = files[coverIndex];
  const coverBase64 = cover.buffer.toString('base64');
  const coverName = images[coverIndex]?.name || `recuerdo_${Date.now()}.jpg`;
  const extraNote = images.length > 1 ? ' (solo la portada se respaldó en Drive; el resto quedó solo en este dispositivo)' : '';

  // 1. Webhook de Google Apps Script configurado
  const webhookUrl = (body?.webhookUrl || process.env.GOOGLE_DRIVE_WEBHOOK_URL || '').trim();
  if (webhookUrl) {
    try {
      const webhookRes = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: coverName,
          ...meta,
          mimeType: cover.mimeType,
          base64: coverBase64,
        }),
      });
      const webhookData = await webhookRes.json();
      if (webhookData.error) throw new Error(webhookData.error);
      return {
        success: true,
        mode: 'webhook',
        driveFileId: webhookData.fileId || null,
        driveUrl: webhookData.fileUrl || webhookData.url || null,
        message: `Foto subida exitosamente a Google Drive mediante Webhook ✨${extraNote}`,
      };
    } catch (webhookErr) {
      console.warn('Error llamando webhook de Drive, continuando con fallback:', webhookErr);
    }
  }

  // 2. Cuenta de Servicio (Service Account) configurada
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;
  const folderId = (body?.folderId || process.env.GOOGLE_DRIVE_FOLDER_ID || '').trim();

  if (clientEmail && privateKeyRaw && folderId) {
    const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });

    const bufferStream = new Readable();
    bufferStream.push(cover.buffer);
    bufferStream.push(null);

    const driveResponse = await drive.files.create({
      requestBody: {
        name: coverName,
        parents: [folderId],
        description: meta.caption,
        appProperties: {
          title: fitAppProperty('title', meta.title),
          date: fitAppProperty('date', meta.date),
          location: fitAppProperty('location', meta.location),
        },
      },
      media: {
        mimeType: cover.mimeType,
        body: bufferStream,
      },
      fields: 'id, name, webViewLink, webContentLink, thumbnailLink',
      supportsAllDrives: true,
    });

    try {
      await drive.permissions.create({
        fileId: driveResponse.data.id as string,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    } catch {
      // En algunas organizaciones no se permite permisos 'anyone', se ignora
    }

    return {
      success: true,
      mode: 'service_account',
      driveFileId: driveResponse.data.id || null,
      driveUrl: driveResponse.data.webViewLink,
      downloadUrl: driveResponse.data.webContentLink || undefined,
      message: `¡Recuerdo guardado con éxito en tu Google Drive! ☁️✨${extraNote}`,
    };
  }

  // 3. Fallback: sin credenciales configuradas, modo local (IndexedDB en el cliente)
  return {
    success: true,
    mode: 'local',
    driveFileId: null,
    message:
      'Recuerdo guardado localmente en tu galería. Para respaldo en la nube, configura GOOGLE_SERVICE_ACCOUNT o GOOGLE_DRIVE_WEBHOOK_URL.',
  };
}
