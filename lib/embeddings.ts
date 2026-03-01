// SERVER-SIDE ONLY — Hugging Face embeddings via official SDK
// Model: BAAI/bge-small-en-v1.5 → 384-dimensional vectors, free tier, no billing required
// Token: https://huggingface.co/settings/tokens (needs "Inference Providers" permission)

import { HfInference } from '@huggingface/inference';

const HF_MODEL = 'BAAI/bge-small-en-v1.5';

function getClient() {
  const key = process.env.HF_API_KEY;
  if (!key) throw new Error('HF_API_KEY is not set');
  return new HfInference(key);
}

async function embed(text: string): Promise<number[]> {
  const hf = getClient();
  const result = await hf.featureExtraction({
    model: HF_MODEL,
    inputs: text,
  });

  // featureExtraction returns number[] | number[][] depending on model
  // bge-small returns a flat number[] for a single string input
  if (Array.isArray(result) && typeof result[0] === 'number') {
    return result as number[];
  }
  // Fallback: 2D array — take first row (CLS token)
  return (result as number[][])[0];
}

export async function generateEmbedding(text: string): Promise<number[]> {
  return embed(text);
}

export async function embedQuery(query: string): Promise<number[]> {
  // bge models recommend this prefix for retrieval queries
  return embed(`Represent this sentence for searching relevant passages: ${query}`);
}
