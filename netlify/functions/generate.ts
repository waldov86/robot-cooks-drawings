import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { generateSVG, generateImage } from '../../lib/gemini';
import type { GenerateRequest, GenerateResponse } from '../../lib/types';
import { isPreset } from '../../lib/types';

export const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    if (!event.body) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Request body is required' }) };
    }

    const body: GenerateRequest = JSON.parse(event.body);

    if (!body.prompt?.trim()) {
      return { statusCode: 400, body: JSON.stringify({ error: 'prompt is required' }) };
    }
    if (body.orientation !== undefined && !['portrait', 'landscape'].includes(body.orientation)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid orientation' }) };
    }
    if (body.preset !== undefined && !isPreset(body.preset)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid preset' }) };
    }

    const preset = isPreset(body.preset) ? body.preset : 'coloring_book';
    const orientation = body.orientation ?? 'portrait';

    let response: GenerateResponse;

    if (preset === 'activity_dots') {
      const svg = await generateSVG({
        prompt: body.prompt,
        preset,
        orientation,
        margin_mm: body.margin_mm ?? 10,
        line_weight_mm: body.line_weight_mm ?? 0.3,
      });
      response = { artifact: { kind: 'svg', svg } };
    } else {
      const { imageBase64, mimeType } = await generateImage({ prompt: body.prompt, preset, orientation });
      response = { artifact: { kind: 'image', imageBase64, mimeType } };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response),
    };
  } catch (err) {
    console.error('[generate]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return { statusCode: 500, body: JSON.stringify({ error: message }) };
  }
};
