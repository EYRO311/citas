import { NextRequest, NextResponse } from 'next/server';
import { processMemoryUpload } from '@/server/drive/uploadService';
import type { UploadRequestBody } from '@/types/memories';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as UploadRequestBody;
    const result = await processMemoryUpload(body);

    if (!result.success && result.error) {
      return NextResponse.json(result, { status: 400, headers: CORS_HEADERS });
    }

    return NextResponse.json(result, { status: 200, headers: CORS_HEADERS });
  } catch (error) {
    console.error('Error subiendo imagen a Google Drive:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'Error interno al procesar la imagen' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
