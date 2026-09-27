import { google } from 'googleapis';
import { Readable } from 'stream';

// Drive limita cada appProperty a 124 bytes (clave + valor, UTF-8)
function fitAppProperty(key, value) {
  let out = String(value || '');
  while (Buffer.byteLength(key + out, 'utf8') > 124) out = out.slice(0, -1);
  return out;
}

export default async function handler(req, res) {
  // Configurar cabeceras CORS y JSON
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Método no permitido. Usa POST.' }));
  }

  try {
    const { name, title, location, caption, date, imageBase64, mimeType } = req.body || {};

    if (!imageBase64) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'No se recibió ninguna imagen (imageBase64 es requerido)' }));
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const fileName = name || `recuerdo_${Date.now()}.jpg`;
    const fileMime = mimeType || 'image/jpeg';

    // Metadatos del recuerdo: /api/drive los lee para mostrarlo igual en cualquier dispositivo
    const meta = {
      title: title || '',
      date: date || new Date().toISOString().split('T')[0],
      location: location || '',
      caption: caption || ''
    };

    // 1. Verificar si hay Webhook de Google Apps Script configurado
    const webhookUrl = (req.body?.webhookUrl || process.env.GOOGLE_DRIVE_WEBHOOK_URL || '').trim();
    if (webhookUrl) {
      try {
        const webhookRes = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: fileName,
            ...meta,
            mimeType: fileMime,
            base64: cleanBase64
          })
        });
        const webhookData = await webhookRes.json();
        if (webhookData.error) throw new Error(webhookData.error);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({
          success: true,
          mode: 'webhook',
          driveFileId: webhookData.fileId || null,
          driveUrl: webhookData.fileUrl || webhookData.url || null,
          message: 'Foto subida exitosamente a Google Drive mediante Webhook ✨'
        }));
      } catch (webhookErr) {
        console.warn('Error llamando webhook de Drive, continuando con fallback:', webhookErr);
      }
    }

    // 2. Verificar si hay Cuenta de Servicio (Service Account) configurada
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;
    const folderId = (req.body?.folderId || process.env.GOOGLE_DRIVE_FOLDER_ID || '').trim();

    if (clientEmail && privateKeyRaw && folderId) {
      const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

      const auth = new google.auth.JWT({
        email: clientEmail,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/drive']
      });

      const drive = google.drive({ version: 'v3', auth });

      const buffer = Buffer.from(cleanBase64, 'base64');
      const bufferStream = new Readable();
      bufferStream.push(buffer);
      bufferStream.push(null);

      const driveResponse = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [folderId],
          description: meta.caption,
          appProperties: {
            title: fitAppProperty('title', meta.title),
            date: fitAppProperty('date', meta.date),
            location: fitAppProperty('location', meta.location)
          }
        },
        media: {
          mimeType: fileMime,
          body: bufferStream
        },
        fields: 'id, name, webViewLink, webContentLink, thumbnailLink',
        supportsAllDrives: true
      });

      // Hacer visible para lectura pública si es posible
      try {
        await drive.permissions.create({
          fileId: driveResponse.data.id,
          requestBody: {
            role: 'reader',
            type: 'anyone'
          }
        });
      } catch (permErr) {
        // En algunas organizaciones no se permite permisos 'anyone', se ignora
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({
        success: true,
        mode: 'service_account',
        driveFileId: driveResponse.data.id,
        driveUrl: driveResponse.data.webViewLink,
        downloadUrl: driveResponse.data.webContentLink,
        message: '¡Recuerdo guardado con éxito en tu Google Drive! ☁️✨'
      }));
    }

    // 3. Fallback: Si no hay credenciales configuradas en el servidor,
    // responder éxito en modo local para que la app cliente almacene en IndexedDB
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      success: true,
      mode: 'local',
      driveFileId: null,
      message: 'Recuerdo guardado localmente en tu galería. Para respaldo en la nube, configura GOOGLE_SERVICE_ACCOUNT o GOOGLE_DRIVE_WEBHOOK_URL.'
    }));

  } catch (error) {
    console.error('Error subiendo imagen a Google Drive:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      success: false,
      error: error.message || 'Error interno al procesar la imagen'
    }));
  }
}
