import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/server/supabase/memoriesService';
import { readNotes, writeNotes } from '@/server/supabase/notesService';
import { NOTES_MAX_LENGTH } from '@/types/notes';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ connected: false, notes: { text: '' } }, { headers: CORS_HEADERS });
  }

  try {
    const notes = await readNotes(supabase);
    return NextResponse.json({ connected: true, notes }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error('Error con Supabase Storage (notas):', error);
    return NextResponse.json({ connected: false, notes: { text: '' }, error: (error as Error).message }, { headers: CORS_HEADERS });
  }
}

export async function PUT(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase no configurado' }, { status: 503, headers: CORS_HEADERS });
  }

  try {
    const body = await req.json();
    if (typeof body?.text !== 'string') {
      return NextResponse.json({ error: 'Texto inválido' }, { status: 400, headers: CORS_HEADERS });
    }
    if (body.text.length > NOTES_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Máximo ${NOTES_MAX_LENGTH} caracteres` },
        { status: 400, headers: CORS_HEADERS }
      );
    }
    const notes = await writeNotes(supabase, body.text);
    return NextResponse.json({ success: true, notes }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error('Error con Supabase Storage (notas):', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500, headers: CORS_HEADERS });
  }
}
