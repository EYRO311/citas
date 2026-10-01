// Código fuente de Google Apps Script para copiarlo al portapapeles
export const CODE_GS_CONTENT = `// ==============================================================================
// ÁLBUM DE NUESTRAS SALIDAS — Puente con Google Drive (Google Apps Script)
// ==============================================================================

const FOLDER_ID = 'PEGA_AQUI_EL_ID_DE_TU_CARPETA';

function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// GET ?action=list → fotos de la carpeta
function doGet() {
  try {
    const files = DriveApp.getFolderById(FOLDER_ID).getFiles();
    const out = [];

    while (files.hasNext()) {
      const file = files.next();
      if (file.isTrashed() || file.getMimeType().indexOf('image/') !== 0) continue;
      out.push({
        id: file.getId(),
        name: file.getName(),
        description: file.getDescription() || '',
        createdTime: file.getDateCreated().toISOString(),
        webViewLink: file.getUrl()
      });
    }

    return json({ files: out });
  } catch (err) {
    return json({ error: String(err) });
  }
}

// POST { name, title, date, location, caption, mimeType, base64 } → sube la foto
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const blob = Utilities.newBlob(
      Utilities.base64Decode(body.base64),
      body.mimeType || 'image/jpeg',
      body.name || ('recuerdo_' + Date.now() + '.jpg')
    );

    const file = DriveApp.getFolderById(FOLDER_ID).createFile(blob);
    file.setDescription(JSON.stringify({
      title: body.title || '',
      date: body.date || '',
      location: body.location || '',
      caption: body.caption || ''
    }));

    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (shareErr) {}

    return json({ fileId: file.getId(), fileUrl: file.getUrl() });
  } catch (err) {
    return json({ error: String(err) });
  }
}`;
