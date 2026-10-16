import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/server/supabase/memoriesService';
import {
  addEvent,
  deleteEvent,
  listEvents,
  replaceAllEvents,
  updateEvent,
  updateEventRSVP,
} from '@/server/supabase/eventsService';
import type { EventItem, EventPayload } from '@/types/events';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};

const NOT_CONFIGURED = {
  connected: false,
  events: [],
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
    const events = await listEvents(supabase);
    return NextResponse.json({ connected: true, events }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error('Error con Supabase Storage (events):', error);
    return NextResponse.json(
      { connected: false, events: [], error: (error as Error).message },
      { headers: CORS_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase no configurado' }, { status: 503, headers: CORS_HEADERS });
  }

  try {
    const body = await req.json();

    // Soporte para reemplazo completo o sincronización en bloque
    if (Array.isArray(body?.events)) {
      await replaceAllEvents(supabase, body.events as EventItem[]);
      return NextResponse.json({ success: true, events: body.events }, { headers: CORS_HEADERS });
    }

    const event = await addEvent(supabase, body as EventPayload);
    return NextResponse.json({ success: true, event }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error('Error con Supabase Storage (events):', error);
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

    // Si es actualización específica de RSVP
    if (typeof body.accepted === 'boolean' && Object.keys(body).length <= 2) {
      const updated = await updateEventRSVP(supabase, id, body.accepted);
      if (!updated) {
        return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404, headers: CORS_HEADERS });
      }
      return NextResponse.json({ success: true, event: updated }, { headers: CORS_HEADERS });
    }

    const updated = await updateEvent(supabase, id, body);
    if (!updated) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404, headers: CORS_HEADERS });
    }
    return NextResponse.json({ success: true, event: updated }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error('Error con Supabase Storage (events):', error);
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

    const removed = await deleteEvent(supabase, id);
    if (!removed) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404, headers: CORS_HEADERS });
    }
    return NextResponse.json({ success: true }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error('Error con Supabase Storage (events):', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500, headers: CORS_HEADERS });
  }
}
