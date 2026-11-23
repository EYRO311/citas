import { NextRequest, NextResponse } from 'next/server';
import { getDriveConfig, hasServiceAccount } from '@/server/drive/driveListService';
import { createResumableSession } from '@/server/drive/driveVideoService';
import { MAX_VIDEO_BYTES } from '@/types/memories';
import type { VideoSessionRequestBody } from '@/types/memories';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const ALLOWED_MIME_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// Chequeo rápido para el cliente: ¿hay cuenta de servicio configurada para subir video?
export async function GET(req: NextRequest) {
  const cfg = getDriveConfig(req.nextUrl);
  const available = hasServiceAccount(cfg);
  return NextResponse.json(
    {
      available,
      message: available
        ? undefined
        : 'Subida de video no disponible: configura GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY y GOOGLE_DRIVE_FOLDER_ID.',
    },
    { headers: CORS_HEADERS }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as VideoSessionRequestBody;
    const cfg = getDriveConfig(req.nextUrl);

    if (!hasServiceAccount(cfg)) {
      return NextResponse.json(
        { success: false, error: 'Google Drive (Service Account) no está configurado.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }
    if (!body?.name || !body?.mimeType || !body?.size) {
      return NextResponse.json(
        { success: false, error: 'Faltan datos del video (name, mimeType, size)' },
        { status: 400, headers: CORS_HEADERS }
      );
    }
    if (!ALLOWED_MIME_TYPES.has(body.mimeType)) {
      return NextResponse.json(
        { success: false, error: 'Formato de video no soportado (usa MP4, WEBM o MOV)' },
        { status: 400, headers: CORS_HEADERS }
      );
    }
    if (body.size > MAX_VIDEO_BYTES) {
      return NextResponse.json(
        { success: false, error: `El video supera el máximo de ${Math.round(MAX_VIDEO_BYTES / 1024 / 1024)}MB` },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const uploadUrl = await createResumableSession(cfg, {
      name: body.name,
      mimeType: body.mimeType,
      size: body.size,
    });

    return NextResponse.json({ success: true, uploadUrl }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error('Error iniciando sesión de subida de video a Drive:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'Error interno al iniciar la subida' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
