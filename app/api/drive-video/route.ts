import { Readable } from 'stream';
import { NextRequest, NextResponse } from 'next/server';
import { getDriveConfig } from '@/server/drive/driveListService';
import { streamDriveVideo } from '@/server/drive/driveVideoService';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Range',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// Proxy de streaming para videos que viven en la carpeta privada de Drive (Service
// Account). Reenvía el header Range para que el <video> del navegador pueda
// buscar/seekear sin descargar el archivo completo de una vez.
export async function GET(req: NextRequest) {
  const fileId = req.nextUrl.searchParams.get('id');
  if (!fileId) {
    return NextResponse.json({ error: 'Falta el parámetro id' }, { status: 400, headers: CORS_HEADERS });
  }

  const cfg = getDriveConfig(req.nextUrl);

  try {
    const { status, contentType, contentRange, contentLength, stream } = await streamDriveVideo(
      cfg,
      fileId,
      req.headers.get('range')
    );

    const headers: Record<string, string> = {
      ...CORS_HEADERS,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=86400',
    };
    if (contentRange) headers['Content-Range'] = contentRange;
    if (contentLength) headers['Content-Length'] = contentLength;

    return new NextResponse(Readable.toWeb(stream as Readable) as unknown as ReadableStream, {
      status: status === 206 ? 206 : 200,
      headers,
    });
  } catch (error) {
    console.error('Error transmitiendo video de Drive:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'No se pudo reproducir el video' },
      { status: 502, headers: CORS_HEADERS }
    );
  }
}
