import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import type { DrawingResult } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const limit = body.limit ?? 6;

    const supabase = createServerSupabase();

    const { data: embRow, error: embError } = await supabase
      .from('drawing_embeddings')
      .select('embedding')
      .eq('drawing_id', id)
      .single();

    if (embError || !embRow) {
      return NextResponse.json({ error: 'Embedding not found' }, { status: 404 });
    }

    const { data, error } = await supabase.rpc('match_drawings', {
      query_embedding: embRow.embedding,
      match_count: limit + 1,
      match_offset: 0,
      filter_tags: null,
      filter_orientation: null,
    });

    if (error) throw new Error(`similar RPC error: ${error.message}`);

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

    return NextResponse.json({ results });
  } catch (err) {
    console.error('[POST /api/drawings/[id]/similar]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
