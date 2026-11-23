import type { DriveVideoItem } from '@/types/driveVideoGallery';

// ==============================================================================
// Galería de videos de una carpeta de Drive pública ("cualquiera con el enlace
// puede ver"), vía API key (solo lectura). No hace proxy del video: el cliente
// lo reproduce directo desde Drive en un iframe (ver DriveVideoGallery.tsx).
// ==============================================================================

const FIELDS = 'files(id,name,thumbnailLink,createdTime)';

function videosInFolderQuery(folderId: string) {
  return `'${folderId}' in parents and mimeType contains 'video/' and trashed = false`;
}

export async function getDriveVideos(): Promise<DriveVideoItem[]> {
  const apiKey = process.env.GOOGLE_API_KEY;
  const folderId = process.env.DRIVE_FOLDER_ID;
  if (!apiKey || !folderId) {
    throw new Error('Falta configurar GOOGLE_API_KEY o DRIVE_FOLDER_ID');
  }

  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('q', videosInFolderQuery(folderId));
  url.searchParams.set('fields', FIELDS);
  url.searchParams.set('orderBy', 'createdTime desc');
  url.searchParams.set('key', apiKey);

  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) {
    throw new Error(`Drive API respondió ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  return (data.files || []) as DriveVideoItem[];
}
