// SERVER-SIDE ONLY — Groq fallback for SVG generation.
// Uses free-tier models only: llama-3.3-70b-versatile and llama-4-scout-17b-16e-instruct.
import Groq from 'groq-sdk';

function getClient(): Groq {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY is not set');
  return new Groq({ apiKey: key });
}

// Free-tier models ranked best→worst for SVG generation quality.
// llama-3.3-70b-versatile: 32k output, strongest instruction following of the free tier.
// llama-4-scout-17b-16e-instruct: fast, 32k output, good fallback.
const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-4-scout-17b-16e-instruct',
];

export async function generateWithGroq(
  systemInstruction: string,
  userPrompt: string,
): Promise<string> {
  const client = getClient();

  let lastError: unknown;
  for (const model of GROQ_MODELS) {
    try {
      console.log(`[groq] Trying model: ${model}`);
      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user',   content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 32768,
      });

      const text = completion.choices[0]?.message?.content?.trim() ?? '';
      console.log(`[groq] SUCCESS with ${model} — output length: ${text.length} chars`);
      console.log(`[groq] Output preview:\n${text.slice(0, 400)}${text.length > 400 ? '\n…' : ''}`);
      return text;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[groq] Model ${model} failed: ${msg.slice(0, 150)}`);
      lastError = err;
    }
  }

  throw new Error(`All Groq models failed. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

export function isGroqAvailable(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}
