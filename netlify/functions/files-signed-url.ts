import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { getSignedUrl } from '../../lib/storage';
import type { SignedUrlRequest, SignedUrlResponse } from '../../lib/types';

export const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    if (!event.body) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Request body is required' }) };
    }

    const body: SignedUrlRequest = JSON.parse(event.body);
    const { path, bucket, expires_in = 3600 } = body;

    if (!path || !bucket) {
      return { statusCode: 400, body: JSON.stringify({ error: 'path and bucket are required' }) };
    }

    const ALLOWED_BUCKETS = ['drawings-svg', 'drawings-pdf', 'drawings-thumb'];
    if (!ALLOWED_BUCKETS.includes(bucket)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid bucket' }) };
    }

    const url = await getSignedUrl(bucket, path, Math.min(expires_in, 86400));
    const response: SignedUrlResponse = { url };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response),
    };
  } catch (err) {
    console.error('[files-signed-url]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return { statusCode: 500, body: JSON.stringify({ error: message }) };
  }
};
