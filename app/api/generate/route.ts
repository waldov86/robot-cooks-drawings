import { NextRequest, NextResponse } from 'next/server';
import { generateSVG, generateImage } from '@/lib/gemini';
import type { GenerateRequest } from '@/lib/types';
import { isPreset } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 180;

export async function POST(req: NextRequest) {
  try {
    const body: GenerateRequest = await req.json();

    if (!body.prompt?.trim()) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }
    if (body.orientation !== undefined && !['portrait', 'landscape'].includes(body.orientation)) {
      return NextResponse.json({ error: 'Invalid orientation' }, { status: 400 });
    }
    if (body.preset !== undefined && !isPreset(body.preset)) {
      return NextResponse.json({ error: 'Invalid preset' }, { status: 400 });
    }

    const preset = isPreset(body.preset) ? body.preset : 'coloring_book';
    const orientation = body.orientation ?? 'portrait';

    if (preset === 'activity_dots') {
      const svg = await generateSVG({
        prompt: body.prompt,
        preset,
        orientation,
        margin_mm: body.margin_mm ?? 10,
        line_weight_mm: body.line_weight_mm ?? 0.3,
      });
      return NextResponse.json({ artifact: { kind: 'svg', svg } });
    } else {
      const { imageBase64, mimeType } = await generateImage({
        prompt: body.prompt,
        preset,
        orientation,
      });
      return NextResponse.json({ artifact: { kind: 'image', imageBase64, mimeType } });
    }
  } catch (err) {
    console.error('[POST /api/generate]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
