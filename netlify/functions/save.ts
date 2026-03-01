import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { v4 as uuidv4 } from 'uuid';
import { extractMetadata } from '../../lib/gemini';
import { generateEmbedding } from '../../lib/embeddings';
import { svgToPdf, svgToThumbnail } from '../../lib/pdf';
import { uploadFile, BUCKETS } from '../../lib/storage';
import { createServerSupabase } from '../../lib/supabase/server';
import type { SaveRequest, SaveResponse } from '../../lib/types';

export const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    if (!event.body) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Request body is required' }) };
    }

    const body: SaveRequest = JSON.parse(event.body);
    const { title, prompt, svg, orientation, margin_mm, line_weight_mm } = body;

    if (!title?.trim() || !prompt?.trim() || !svg?.trim()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'title, prompt, and svg are required' }),
      };
    }

    const drawingId = uuidv4();
    const ownerId = process.env.DEFAULT_OWNER_ID;
    const basePath = `${ownerId}/${drawingId}`;

    // Run PDF generation, thumbnail generation, and metadata extraction in parallel
    const [pdfBuffer, thumbBuffer, metadata] = await Promise.all([
      svgToPdf(svg, orientation),
      svgToThumbnail(svg, orientation),
      extractMetadata({ prompt, svg }),
    ]);

    // Generate embedding from summary + tags + prompt
    const embeddingText = [
      prompt,
      metadata.depiction_summary,
      metadata.tags.join(', '),
    ]
      .filter(Boolean)
      .join('. ');

    const [svgPath, pdfPath, thumbPath, embedding] = await Promise.all([
      uploadFile(BUCKETS.SVG, `${basePath}.svg`, svg, 'image/svg+xml'),
      uploadFile(BUCKETS.PDF, `${basePath}.pdf`, pdfBuffer, 'application/pdf'),
      uploadFile(BUCKETS.THUMB, `${basePath}.png`, thumbBuffer, 'image/png'),
      generateEmbedding(embeddingText),
    ]);

    const supabase = createServerSupabase();

    // Insert drawing row
    const { error: drawingError } = await supabase.from('drawings').insert({
      id: drawingId,
      owner_id: ownerId,
      title,
      prompt,
      orientation,
      margin_mm: margin_mm ?? 10,
      line_weight_mm: line_weight_mm ?? 0.3,
      svg_path: svgPath,
      pdf_path: pdfPath,
      thumb_path: thumbPath,
    });

    if (drawingError) throw new Error(`drawings insert: ${drawingError.message}`);

    // Insert metadata row
    const { error: metaError } = await supabase.from('drawing_metadata').insert({
      drawing_id: drawingId,
      depiction_summary: metadata.depiction_summary,
      tags: metadata.tags,
      objects: metadata.objects,
      style: metadata.style,
      page: metadata.page,
      raw_model_output: metadata.raw_model_output,
    });

    if (metaError) throw new Error(`drawing_metadata insert: ${metaError.message}`);

    // Insert embedding row — pgvector expects array literal string
    const vectorLiteral = `[${embedding.join(',')}]`;
    const { error: embError } = await supabase.from('drawing_embeddings').insert({
      drawing_id: drawingId,
      embedding: vectorLiteral,
      embedding_text: embeddingText,
    });

    if (embError) throw new Error(`drawing_embeddings insert: ${embError.message}`);

    const response: SaveResponse = { id: drawingId };
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response),
    };
  } catch (err) {
    console.error('[save]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return { statusCode: 500, body: JSON.stringify({ error: message }) };
  }
};
