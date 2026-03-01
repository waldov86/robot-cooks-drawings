import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { createServerSupabase } from '../../lib/supabase/server';
import type { DrawingResult } from '../../lib/types';

// Handles POST /api/drawings/:id/similar
export const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    // Extract ID from path: /api/drawings/:id/similar
    const parts = event.path.split('/');
    const similarIndex = parts.indexOf('similar');
    const id = similarIndex > 0 ? parts[similarIndex - 1] : null;

    if (!id) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Drawing ID is required' }) };
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const limit = body.limit ?? 6;

    const supabase = createServerSupabase();

    // Fetch the stored embedding for this drawing
    const { data: embRow, error: embError } = await supabase
      .from('drawing_embeddings')
      .select('embedding')
      .eq('drawing_id', id)
      .single();

    if (embError || !embRow) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Embedding not found for drawing' }) };
    }

    const { data, error } = await supabase.rpc('match_drawings', {
      query_embedding: embRow.embedding,
      match_count: limit + 1,
      match_offset: 0,
      filter_tags: null,
      filter_orientation: null,
    });

    if (error) throw new Error(`similar RPC error: ${error.message}`);

    // Exclude the source drawing from results
    const results: DrawingResult[] = (data ?? [])
      .filter((row: Record<string, unknown>) => row.id !== id)
      .slice(0, limit)
      .map((row: Record<string, unknown>) => ({
        id: row.id as string,
        title: row.title as string,
        prompt: row.prompt as string,
        orientation: row.orientation as string,
        margin_mm: row.margin_mm as number,
        line_weight_mm: row.line_weight_mm as number,
        svg_path: row.svg_path as string,
        pdf_path: row.pdf_path as string,
        thumb_path: row.thumb_path as string | null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        similarity: row.similarity as number,
      }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results }),
    };
  } catch (err) {
    console.error('[drawings-similar]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return { statusCode: 500, body: JSON.stringify({ error: message }) };
  }
};
