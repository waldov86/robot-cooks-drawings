// SERVER-SIDE ONLY — HuggingFace Inference fallback for image generation
import { InferenceClient } from '@huggingface/inference';
import type { Orientation, Preset } from './types';

// FLUX.1-schnell is free-tier on HF router, fast, good quality for line art
const HF_IMAGE_MODELS = [
  'black-forest-labs/FLUX.1-schnell',
  'black-forest-labs/FLUX.1-dev',
];

export function isHfImageAvailable(): boolean {
  return !!process.env.HF_API_KEY;
}

export async function generateImageWithHf(params: {
  prompt: string;
  preset: Preset;
  orientation: Orientation;
}): Promise<{ imageBase64: string; mimeType: 'image/png' }> {
  const key = process.env.HF_API_KEY;
  if (!key) throw new Error('HF_API_KEY is not set');

  const client = new InferenceClient(key);

  const [width, height] = params.orientation === 'portrait' ? [832, 1152] : [1152, 832];

  const presetHint = params.preset === 'story_sketch'
    ? 'expressive kids storybook illustration, charming cartoon characters with personality'
    : 'classic kids coloring book page, large colorable regions, child-friendly';

  const fullPrompt = `${presetHint}, ${params.prompt}. Black and white line art only, bold clean outlines, no color fills, no shading, no gradients, pure white background, kids cartoon illustration style, printable coloring page, A4 ${params.orientation} format`;

  const negativePrompt = 'color, shading, gradients, photorealistic, 3D render, watermark, text, blurry, dark background';

  let lastError: unknown;
  for (const model of HF_IMAGE_MODELS) {
    try {
      console.log(`[hf-image] Trying model: ${model}`);
      const blob = await client.textToImage(
        {
          model,
          inputs: fullPrompt,
          parameters: {
            width,
            height,
            negative_prompt: negativePrompt,
            num_inference_steps: 4, // schnell works well at 4 steps
          } as Record<string, unknown>,
        },
        { outputType: 'blob' }
      );

      const arrayBuffer = await (blob as Blob).arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const imageBase64 = buffer.toString('base64');
      console.log(`[hf-image] SUCCESS with ${model} — ${imageBase64.length} base64 chars`);
      return { imageBase64, mimeType: 'image/png' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[hf-image] Model ${model} failed: ${msg.slice(0, 200)}`);
      lastError = err;
    }
  }
  throw new Error(`All HF image models failed. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}
