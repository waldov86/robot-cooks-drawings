import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = createServerSupabase();

    const { data: drawing, error } = await supabase
      .from('drawings')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !drawing) {
      return NextResponse.json({ error: 'Drawing not found' }, { status: 404 });
    }

    const { data: metadata } = await supabase
      .from('drawing_metadata')
      .select('*')
      .eq('drawing_id', id)
      .single();

    return NextResponse.json({ ...drawing, metadata });
  } catch (err) {
    console.error('[GET /api/drawings/[id]]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
