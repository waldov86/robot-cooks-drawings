// SERVER-SIDE ONLY
import { createServerSupabase } from './supabase/server';

export const BUCKETS = {
  SVG: 'drawings-svg',
  PDF: 'drawings-pdf',
  THUMB: 'drawings-thumb',
} as const;

export async function uploadFile(
  bucket: string,
  path: string,
  data: Buffer | string,
  contentType: string
): Promise<string> {
  const supabase = createServerSupabase();
  const body = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;

  const { error } = await supabase.storage.from(bucket).upload(path, body, {
    contentType,
    upsert: true,
  });

  if (error) {
    throw new Error(`Storage upload failed [${bucket}/${path}]: ${error.message}`);
  }

  return path;
}

export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 3600
): Promise<string> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create signed URL [${bucket}/${path}]: ${error?.message}`);
  }

  return data.signedUrl;
}
