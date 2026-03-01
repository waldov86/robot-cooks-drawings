-- Semantic search function using pgvector cosine similarity
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

-- Keyword search helper (full text search on title + prompt + tags + summary)
CREATE OR REPLACE FUNCTION keyword_search_drawings(
  search_query      text,
  match_count       int     DEFAULT 20,
  match_offset      int     DEFAULT 0,
  filter_orientation text   DEFAULT NULL
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
  rank            float,
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
    ts_rank(
      to_tsvector('english', d.title || ' ' || d.prompt || ' ' || COALESCE(dm.depiction_summary, '')),
      plainto_tsquery('english', search_query)
    ) AS rank,
    jsonb_build_object(
      'drawing_id',         dm.drawing_id,
      'depiction_summary',  dm.depiction_summary,
      'tags',               dm.tags,
      'objects',            dm.objects,
      'style',              dm.style,
      'page',               dm.page
    ) AS metadata
  FROM drawings d
  LEFT JOIN drawing_metadata dm ON dm.drawing_id = d.id
  WHERE
    to_tsvector('english', d.title || ' ' || d.prompt || ' ' || COALESCE(dm.depiction_summary, ''))
    @@ plainto_tsquery('english', search_query)
    AND (filter_orientation IS NULL OR d.orientation = filter_orientation)
  ORDER BY rank DESC
  LIMIT match_count
  OFFSET match_offset;
END;
$$;
