-- Fix: IVFFLAT index requires lists=100 minimum rows to function.
-- With <100 drawings, pgvector won't return results from the IVFFLAT index.
-- Replace with HNSW which works at any scale (0 to millions).

DROP INDEX IF EXISTS drawing_embeddings_ivfflat_idx;

CREATE INDEX IF NOT EXISTS drawing_embeddings_hnsw_idx
  ON drawing_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
