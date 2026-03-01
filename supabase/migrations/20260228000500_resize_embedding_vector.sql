-- Resize embedding column from vector(768) to vector(384)
-- Required because we switched from Gemini text-embedding-004/embedding-001 (768 dims)
-- to Hugging Face BAAI/bge-small-en-v1.5 (384 dims)
--
-- Run this if you already ran migration 002 and have the table.
-- If you are running migrations fresh, 002 will be updated directly below.

-- Drop the old IVFFLAT index first (cannot alter vector dimension with index present)
DROP INDEX IF EXISTS drawing_embeddings_ivfflat_idx;

-- Alter the column type (this drops and recreates the column; existing data is lost)
ALTER TABLE drawing_embeddings
  ALTER COLUMN embedding TYPE vector(384);

-- Recreate the IVFFLAT cosine index for 384-dim vectors
CREATE INDEX drawing_embeddings_ivfflat_idx
  ON drawing_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Recreate match_drawings with the updated vector(384) signature
DROP FUNCTION IF EXISTS match_drawings(vector, int, int, text[], text);

CREATE OR REPLACE FUNCTION match_drawings(
  query_embedding   vector(384),
  match_count       int             DEFAULT 20,
  match_offset      int             DEFAULT 0,
  filter_tags       text[]          DEFAULT NULL,
  filter_orientation text           DEFAULT NULL
)
RETURNS TABLE (
  id              uuid,
  title           text,
  prompt          text,
  orientation     text,
  margin_mm       int,
  line_weight_mm  numeric,
  svg_path        text,
  pdf_path        text,
  thumb_path      text,
  created_at      timestamptz,
  updated_at      timestamptz,
  similarity      float,
  metadata        jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.title,
    d.prompt,
    d.orientation,
    d.margin_mm,
    d.line_weight_mm,
    d.svg_path,
    d.pdf_path,
    d.thumb_path,
    d.created_at,
    d.updated_at,
    1 - (de.embedding <=> query_embedding) AS similarity,
    jsonb_build_object(
      'drawing_id',         dm.drawing_id,
      'depiction_summary',  dm.depiction_summary,
      'tags',               dm.tags,
      'objects',            dm.objects,
      'style',              dm.style,
      'page',               dm.page
    ) AS metadata
  FROM drawings d
  INNER JOIN drawing_embeddings de ON de.drawing_id = d.id
  LEFT JOIN drawing_metadata dm ON dm.drawing_id = d.id
  WHERE
    (filter_tags IS NULL OR dm.tags @> filter_tags)
    AND (filter_orientation IS NULL OR d.orientation = filter_orientation)
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count
  OFFSET match_offset;
END;
$$;
