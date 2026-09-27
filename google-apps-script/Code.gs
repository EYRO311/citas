// ==============================================================================
// ÁLBUM DE NUESTRAS SALIDAS — Puente con Google Drive (Google Apps Script)
//
// Cómo instalarlo (5 minutos, sin Google Cloud Console):
//  1. En Google Drive crea la carpeta "Nuestras Salidas".
//     Compártela como "Cualquier persona con el enlace · Lector" para que la app
//     pueda mostrar las fotos.
//  2. Copia el ID de la carpeta (lo que va después de /folders/ en la URL) y
//     pégalo abajo en FOLDER_ID.
//  3. Entra a https://script.google.com → Nuevo proyecto → pega este archivo.
//  4. Implementar → Nueva implementación → Tipo: App web
//       Ejecutar como: Yo
//       Quién tiene acceso: Cualquier persona
//     Autoriza los permisos de Drive cuando te los pida.
//  5. Copia la URL que termina en /exec y ponla en Vercel (o en .env.local) como
//     GOOGLE_DRIVE_WEBHOOK_URL. Vuelve a desplegar la app.
//
// Listo: todo lo que subas a la carpeta (desde la app o desde Drive) aparece en
// el álbum. Si cambias este código, crea una nueva versión de la implementación.
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
    } catch (shareErr) {
      // Algunas cuentas no permiten compartir por enlace; hereda lo de la carpeta
    }

    return json({ fileId: file.getId(), fileUrl: file.getUrl() });
  } catch (err) {
    return json({ error: String(err) });
  }
}
