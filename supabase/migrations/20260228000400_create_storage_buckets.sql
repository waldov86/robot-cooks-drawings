-- Create storage buckets
-- Run this in the Supabase SQL editor or via supabase CLI
-- (Storage buckets can also be created via the dashboard)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('drawings-svg',  'drawings-svg',  false, 5242880,   ARRAY['image/svg+xml']),
  ('drawings-pdf',  'drawings-pdf',  false, 20971520,  ARRAY['application/pdf']),
  ('drawings-thumb','drawings-thumb',false, 2097152,   ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- RLS policies: service role can do everything (server-side only)
-- Anon users can only read thumbnails for the library view via signed URLs

-- drawings-svg: service role full access
CREATE POLICY "service role full access svg"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'drawings-svg')
  WITH CHECK (bucket_id = 'drawings-svg');

-- drawings-pdf: service role full access
CREATE POLICY "service role full access pdf"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'drawings-pdf')
  WITH CHECK (bucket_id = 'drawings-pdf');

-- drawings-thumb: service role full access
CREATE POLICY "service role full access thumb"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'drawings-thumb')
  WITH CHECK (bucket_id = 'drawings-thumb');

-- RLS on database tables
ALTER TABLE drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_embeddings ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS; anon key is read-only for now
-- In a multi-user setup, replace these with user-scoped policies

CREATE POLICY "anon read drawings" ON drawings
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon read drawing_metadata" ON drawing_metadata
  FOR SELECT TO anon USING (true);

-- Embeddings are only accessible server-side
CREATE POLICY "service role drawing_embeddings" ON drawing_embeddings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service role drawings" ON drawings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service role drawing_metadata" ON drawing_metadata
  FOR ALL TO service_role USING (true) WITH CHECK (true);
