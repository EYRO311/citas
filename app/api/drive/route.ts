import { NextRequest, NextResponse } from 'next/server';
import { getDriveConfig, getProxiedDriveImage, listDriveMemories } from '@/server/drive/driveListService';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  const cfg = getDriveConfig(req.nextUrl);
  const fileId = req.nextUrl.searchParams.get('id');

  try {
    if (fileId) {
      const sizeParam = parseInt(req.nextUrl.searchParams.get('size') || '', 10) || 1200;
      const size = Math.min(Math.max(sizeParam, 200), 2400);
      const { buffer, contentType } = await getProxiedDriveImage(cfg, fileId, size);
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400, s-maxage=604800',
        },
      });
    }

    const { mode, memories } = await listDriveMemories(cfg);

    if (!mode) {
      return NextResponse.json(
        {
          connected: false,
          mode: 'local',
          memories: [],
          message:
            'Modo local activo. Las fotos se guardan en el navegador. Configura Google Drive para ver las fotos de la carpeta aquí.',
        },
        { headers: { ...CORS_HEADERS, 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.json(
      { connected: true, mode, memories, message: `Google Drive conectado · ${memories.length} fotos` },
      { headers: { ...CORS_HEADERS, 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=60' } }
    );
  } catch (error) {
    console.error('Error consultando Google Drive:', error);
    return NextResponse.json(
      { connected: false, mode: 'local', memories: [], error: (error as Error).message },
      { status: fileId ? 502 : 200, headers: { ...CORS_HEADERS, 'Cache-Control': 'no-store' } }
    );
  }
}
