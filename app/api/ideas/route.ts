import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/server/supabase/memoriesService';
import { addIdea, deleteIdea, listIdeas, updateIdea } from '@/server/supabase/ideasService';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};

const NOT_CONFIGURED = {
  connected: false,
  ideas: [],
  message: 'Supabase no configurado (faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY).',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(NOT_CONFIGURED, { headers: CORS_HEADERS });
  }

  try {
    const ideas = await listIdeas(supabase);
    return NextResponse.json({ connected: true, ideas }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error('Error con Supabase Storage (ideas):', error);
    return NextResponse.json({ connected: false, ideas: [], error: (error as Error).message }, { headers: CORS_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase no configurado' }, { status: 503, headers: CORS_HEADERS });
  }

  try {
    const body = await req.json();
    const idea = await addIdea(supabase, { title: body?.title, link: body?.link });
    return NextResponse.json({ success: true, idea }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error('Error con Supabase Storage (ideas):', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase no configurado' }, { status: 503, headers: CORS_HEADERS });
  }

  try {
    const body = await req.json();
    const id = Number(body?.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400, headers: CORS_HEADERS });
    }

    const updated = await updateIdea(supabase, id, { title: body?.title, link: body?.link });
    if (!updated) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404, headers: CORS_HEADERS });
    }
    return NextResponse.json({ success: true, idea: updated }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error('Error con Supabase Storage (ideas):', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase no configurado' }, { status: 503, headers: CORS_HEADERS });
  }

  try {
    const id = Number(req.nextUrl.searchParams.get('id'));
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400, headers: CORS_HEADERS });
    }

    const removed = await deleteIdea(supabase, id);
    if (!removed) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404, headers: CORS_HEADERS });
    }
    return NextResponse.json({ success: true }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error('Error con Supabase Storage (ideas):', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500, headers: CORS_HEADERS });
  }
}
