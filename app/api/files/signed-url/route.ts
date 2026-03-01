import { NextRequest, NextResponse } from 'next/server';
import { getSignedUrl } from '@/lib/storage';
import type { SignedUrlRequest } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body: SignedUrlRequest = await req.json();
    const { path, bucket, expires_in = 3600 } = body;

    if (!path || !bucket) {
      return NextResponse.json({ error: 'path and bucket are required' }, { status: 400 });
    }

    const ALLOWED_BUCKETS = ['drawings-svg', 'drawings-pdf', 'drawings-thumb'];
    if (!ALLOWED_BUCKETS.includes(bucket)) {
      return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 });
    }

    const url = await getSignedUrl(bucket, path, Math.min(expires_in, 86400));
    return NextResponse.json({ url });
  } catch (err) {
    console.error('[POST /api/files/signed-url]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
