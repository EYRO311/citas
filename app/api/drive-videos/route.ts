import { NextResponse } from 'next/server';
import { getDriveVideos } from '@/server/drive/driveVideoGalleryService';

export const revalidate = 300;

export async function GET() {
  try {
    const videos = await getDriveVideos();
    return NextResponse.json({ videos });
  } catch (error) {
    console.error('Error listando videos de Drive:', error);
    return NextResponse.json(
      { videos: [], error: (error as Error).message || 'No se pudieron cargar los videos' },
      { status: 502 }
    );
  }
}
