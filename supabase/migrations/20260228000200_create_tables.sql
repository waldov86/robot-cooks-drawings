-- Drawings table
CREATE TABLE IF NOT EXISTS drawings (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid          NOT NULL,
  title           text          NOT NULL,
  prompt          text          NOT NULL,
  orientation     text          NOT NULL CHECK (orientation IN ('portrait', 'landscape')),
  margin_mm       int           NOT NULL DEFAULT 10,
  line_weight_mm  numeric       NOT NULL DEFAULT 0.3,
  svg_path        text          NOT NULL,
  pdf_path        text          NOT NULL,
  thumb_path      text,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER drawings_updated_at
  BEFORE UPDATE ON drawings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Drawing metadata table
CREATE TABLE IF NOT EXISTS drawing_metadata (
  drawing_id          uuid    PRIMARY KEY REFERENCES drawings(id) ON DELETE CASCADE,
  depiction_summary   text    NOT NULL,
  tags                text[]  NOT NULL DEFAULT '{}',
  objects             jsonb   NOT NULL DEFAULT '[]',
  style               jsonb   NOT NULL DEFAULT '{}',
  page                jsonb   NOT NULL DEFAULT '{}',
  raw_model_output    jsonb   NOT NULL DEFAULT '{}'
);

-- Drawing embeddings table
CREATE TABLE IF NOT EXISTS drawing_embeddings (
  drawing_id      uuid            PRIMARY KEY REFERENCES drawings(id) ON DELETE CASCADE,
  embedding       vector(384)     NOT NULL,
  embedding_text  text            NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS drawings_owner_idx ON drawings(owner_id);
CREATE INDEX IF NOT EXISTS drawings_created_at_idx ON drawings(created_at DESC);
CREATE INDEX IF NOT EXISTS drawings_orientation_idx ON drawings(orientation);

-- GIN index on tags for fast array contains queries
CREATE INDEX IF NOT EXISTS drawing_metadata_tags_gin ON drawing_metadata USING GIN(tags);

-- IVFFLAT cosine index on embedding
-- Note: requires at least 1 row before the index is effective
-- lists = number of clusters (100 is good for up to ~1M rows)
CREATE INDEX IF NOT EXISTS drawing_embeddings_ivfflat_idx
  ON drawing_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
