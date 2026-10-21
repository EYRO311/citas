import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/server/supabase/memoriesService';
import { readMemoriesSettings, writeMemoriesSettings } from '@/server/supabase/memoriesSettingsService';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};

const DEFAULT_SETTINGS = { sortMode: 'date' as const, manualOrder: [] as string[] };

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ connected: false, settings: DEFAULT_SETTINGS }, { headers: CORS_HEADERS });
  }

  try {
    const settings = await readMemoriesSettings(supabase);
    return NextResponse.json({ connected: true, settings }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error('Error con Supabase Storage (orden de recuerdos):', error);
    return NextResponse.json(
      { connected: false, settings: DEFAULT_SETTINGS, error: (error as Error).message },
      { headers: CORS_HEADERS }
    );
  }
}

export async function PUT(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase no configurado' }, { status: 503, headers: CORS_HEADERS });
  }

  try {
    const body = await req.json();
    if (body?.sortMode !== 'date' && body?.sortMode !== 'manual' && body?.sortMode !== 'created') {
      return NextResponse.json({ error: 'sortMode inválido' }, { status: 400, headers: CORS_HEADERS });
    }
    const manualOrder = Array.isArray(body.manualOrder) ? body.manualOrder.filter((x: unknown) => typeof x === 'string') : [];
    const settings = await writeMemoriesSettings(supabase, { sortMode: body.sortMode, manualOrder });
    return NextResponse.json({ success: true, settings }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error('Error con Supabase Storage (orden de recuerdos):', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500, headers: CORS_HEADERS });
  }
}
