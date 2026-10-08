import { NextRequest, NextResponse } from 'next/server';
import { deleteMemory, getSupabase, isValidId, listMemories, updateMemoryMeta } from '@/server/supabase/memoriesService';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
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

    const updated = await updateMemoryMeta(supabase, id, {
      title: body.title,
      date: body.date,
      location: body.location,
      caption: body.caption,
    });
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
