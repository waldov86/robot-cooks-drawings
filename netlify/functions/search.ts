import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { embedQuery } from '../../lib/embeddings';
import { createServerSupabase } from '../../lib/supabase/server';
import type { SearchRequest, SearchResponse, DrawingResult } from '../../lib/types';

export const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    if (!event.body) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Request body is required' }) };
    }

    const body: SearchRequest = JSON.parse(event.body);
    const { query, limit = 20, offset = 0, tags, orientation } = body;

    if (!query?.trim()) {
      return { statusCode: 400, body: JSON.stringify({ error: 'query is required' }) };
    }

    const queryEmbedding = await embedQuery(query);
    const vectorLiteral = `[${queryEmbedding.join(',')}]`;

    const supabase = createServerSupabase();

    // Use the match_drawings RPC function defined in migrations
    const { data, error } = await supabase.rpc('match_drawings', {
      query_embedding: vectorLiteral,
      match_count: limit,
      match_offset: offset,
      filter_tags: tags ?? null,
      filter_orientation: orientation ?? null,
    });

    if (error) throw new Error(`search RPC error: ${error.message}`);

    const results: DrawingResult[] = (data ?? []).map((row: Record<string, unknown>) => ({
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
      metadata: row.metadata as DrawingResult['metadata'],
    }));

    const response: SearchResponse = { results, total: results.length };
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response),
    };
  } catch (err) {
    console.error('[search]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return { statusCode: 500, body: JSON.stringify({ error: message }) };
  }
};
