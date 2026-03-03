-- Allow image/png in drawings-svg bucket
-- The bucket stores both SVG files and PNG image artifacts (from Gemini image generation)
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/svg+xml', 'image/png']
WHERE id = 'drawings-svg';
