import { getSupabase, listMemories, deleteMemory, isValidId } from './_supabase.js';

// ==============================================================================
// GET    /api/memories       → recuerdos guardados en Supabase Storage
// DELETE /api/memories?id=X  → borra el recuerdo X (foto + metadatos)
// ==============================================================================

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  return res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  const supabase = getSupabase();
  if (!supabase) {
    return sendJson(res, 200, {
      connected: false,
      memories: [],
      message: 'Supabase no configurado (faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY).'
    });
  }

  try {
    if (req.method === 'GET') {
      const memories = await listMemories(supabase);
      return sendJson(res, 200, { connected: true, memories });
    }

    if (req.method === 'DELETE') {
      const id = new URL(req.url, 'http://localhost').searchParams.get('id');
      if (!isValidId(id)) return sendJson(res, 400, { error: 'ID inválido' });
      const removed = await deleteMemory(supabase, id);
      if (removed === 0) return sendJson(res, 404, { error: 'Recuerdo no encontrado' });
      return sendJson(res, 200, { success: true, removed });
    }

    return sendJson(res, 405, { error: 'Método no permitido' });
  } catch (error) {
    console.error('Error con Supabase Storage:', error);
    if (req.method === 'GET') {
      // No romper la galería: se sigue viendo lo local y lo de Drive
      return sendJson(res, 200, { connected: false, memories: [], error: error.message });
    }
    return sendJson(res, 500, { error: error.message });
  }
}
