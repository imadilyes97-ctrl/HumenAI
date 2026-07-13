-- HumenAI — Migration 003 : Passage GPT-4o → Gemini embeddings (768d)
-- Execute dans Supabase SQL Editor après la 001 et 002

BEGIN;

-- 1. Supprimer l'index IVFFlat (sinon ALTER COLUMN bloque)
DROP INDEX IF EXISTS idx_chunks_embedding_ivfflat;

-- 2. Supprimer la fonction RAG qui référence VECTOR(1536)
DROP FUNCTION IF EXISTS search_tenant_chunks(UUID, VECTOR(1536), INT, FLOAT);

-- 3. Modifier la colonne embedding : 1536 → 768
ALTER TABLE document_chunks ALTER COLUMN embedding TYPE VECTOR(768) USING embedding::VECTOR(768);

-- 4. Recréer la fonction avec la nouvelle dimension
CREATE OR REPLACE FUNCTION search_tenant_chunks(
  p_tenant_id UUID,
  p_embedding VECTOR(768),
  p_match_count INT DEFAULT 20,
  p_similarity_threshold FLOAT DEFAULT 0.75
)
RETURNS TABLE(chunk_id UUID, content TEXT, document_title TEXT, document_id UUID, chunk_index INT, heading TEXT, similarity FLOAT, token_count INT)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT dc.id, dc.content, d.title, dc.document_id, dc.chunk_index, dc.heading,
         1 - (dc.embedding <=> p_embedding) AS similarity_score,
         dc.token_count
  FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id AND d.tenant_id = p_tenant_id AND d.status = 'ready'
  WHERE dc.tenant_id = p_tenant_id
    AND dc.is_active = true
    AND dc.document_version_id IN (
      SELECT dv.id FROM document_versions dv WHERE dv.document_id = d.id AND dv.version = d.current_version
    )
  ORDER BY dc.embedding <=> p_embedding
  LIMIT p_match_count;
END;
$$;

-- 5. Recréer l'index IVFFlat (lists = 100 par défaut, à ajuster selon volume)
CREATE INDEX idx_chunks_embedding_ivfflat ON document_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

COMMIT;
