import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/server/supabase/memoriesService';
import { deleteLetter, readLetter, writeLetter } from '@/server/supabase/letterService';
import type { LetterContent } from '@/types/letter';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};

const NOT_CONFIGURED = {
  connected: false,
  letter: null,
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
    const letter = await readLetter(supabase);
    return NextResponse.json({ connected: true, letter }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error('Error con Supabase Storage (letter):', error);
    return NextResponse.json({ connected: false, letter: null, error: (error as Error).message }, { headers: CORS_HEADERS });
  }
}

export async function PUT(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase no configurado' }, { status: 503, headers: CORS_HEADERS });
  }

  try {
    const letter = (await req.json()) as LetterContent;
    await writeLetter(supabase, letter);
    return NextResponse.json({ success: true, letter }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error('Error con Supabase Storage (letter):', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function DELETE() {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase no configurado' }, { status: 503, headers: CORS_HEADERS });
  }

  try {
    await deleteLetter(supabase);
    return NextResponse.json({ success: true }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error('Error con Supabase Storage (letter):', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500, headers: CORS_HEADERS });
  }
}
