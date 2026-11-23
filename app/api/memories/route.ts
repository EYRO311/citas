import { NextRequest, NextResponse } from 'next/server';
import {
  createVideoMemory,
  deleteMemory,
  getSupabase,
  isValidId,
  listMemories,
  updateMemory,
} from '@/server/supabase/memoriesService';
import type { EditPhotoInput, VideoFinishRequestBody } from '@/types/memories';

const MAX_PHOTOS = 6;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      {
        connected: false,
        memories: [],
        message: 'Supabase no configurado (faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY).',
      },
      { headers: CORS_HEADERS }
    );
  }

  try {
    const memories = await listMemories(supabase);
    return NextResponse.json({ connected: true, memories }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error('Error con Supabase Storage:', error);
    return NextResponse.json(
      { connected: false, memories: [], error: (error as Error).message },
      { headers: CORS_HEADERS }
    );
  }
}

// Cierra el flujo de subida de video: el archivo ya está en Drive (lo subió el
// navegador directo con la sesión resumable), acá solo se guarda el metadata +
// la miniatura, igual que un recuerdo de foto.
export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { success: false, error: 'Supabase no configurado (faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY).' },
      { status: 503, headers: CORS_HEADERS }
    );
  }

  try {
    const body = (await req.json()) as VideoFinishRequestBody;
    if (body?.kind !== 'video' || !body.driveFileId || !body.thumbnail?.base64) {
      return NextResponse.json(
        { success: false, error: 'Faltan datos del video (driveFileId, thumbnail)' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const memory = await createVideoMemory(supabase, {
      driveFileId: body.driveFileId,
      durationSec: body.durationSec,
      thumbnail: body.thumbnail,
      meta: {
        title: body.title || '',
        date: body.date || new Date().toISOString().split('T')[0],
        location: body.location || '',
        caption: body.caption || '',
      },
    });

    return NextResponse.json({ success: true, memory }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error('Error guardando recuerdo de video:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'Error interno al guardar el video' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      {
        connected: false,
        memories: [],
        message: 'Supabase no configurado (faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY).',
      },
      { headers: CORS_HEADERS }
    );
  }

  try {
    const body = await req.json();
    const id = body?.id;
    if (!isValidId(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400, headers: CORS_HEADERS });
    }

    const photos = Array.isArray(body.photos) ? (body.photos as EditPhotoInput[]) : undefined;
    if (photos && photos.length > MAX_PHOTOS) {
      return NextResponse.json(
        { error: `Máximo ${MAX_PHOTOS} fotos por recuerdo` },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const updated = await updateMemory(
      supabase,
      id,
      {
        title: body.title,
        date: body.date,
        location: body.location,
        caption: body.caption,
      },
      photos ? { photos, coverIndex: Number(body.coverIndex) || 0 } : undefined
    );
    if (!updated) {
      return NextResponse.json({ error: 'Recuerdo no encontrado' }, { status: 404, headers: CORS_HEADERS });
    }
    return NextResponse.json({ success: true, memory: updated }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error('Error con Supabase Storage:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      {
        connected: false,
        memories: [],
        message: 'Supabase no configurado (faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY).',
      },
      { headers: CORS_HEADERS }
    );
  }

  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!isValidId(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400, headers: CORS_HEADERS });
    }
    const removed = await deleteMemory(supabase, id as string);
    if (removed === 0) {
      return NextResponse.json({ error: 'Recuerdo no encontrado' }, { status: 404, headers: CORS_HEADERS });
    }
    return NextResponse.json({ success: true, removed }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error('Error con Supabase Storage:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500, headers: CORS_HEADERS });
  }
}
