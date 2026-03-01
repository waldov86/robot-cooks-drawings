import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { createServerSupabase } from '../../lib/supabase/server';

// Handles GET /api/drawings/:id
export const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    // Netlify Functions path: /api/drawings/:id
    const id = event.path.split('/').pop();
    if (!id) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Drawing ID is required' }) };
    }

    const supabase = createServerSupabase();

    const { data: drawing, error: drawingError } = await supabase
      .from('drawings')
      .select('*')
      .eq('id', id)
      .single();

    if (drawingError || !drawing) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Drawing not found' }) };
    }

    const { data: metadata } = await supabase
      .from('drawing_metadata')
      .select('*')
      .eq('drawing_id', id)
      .single();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...drawing, metadata }),
    };
  } catch (err) {
    console.error('[drawings-id]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return { statusCode: 500, body: JSON.stringify({ error: message }) };
  }
};
