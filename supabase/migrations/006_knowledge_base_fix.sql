-- HumenAI — Migration 006 : Fix documents table for code compatibility
-- La table documents utilisée par embedding.ts a une structure plate
-- (content + embedding inline) plutôt que la structure 3-tables du schema original.
-- Cette migration crée la structure correcte attendue par le code.
-- Exécuter dans Supabase SQL Editor.

BEGIN;

-- Supprimer les anciennes tables si elles existent
DROP TABLE IF EXISTS document_chunks CASCADE;
DROP TABLE IF EXISTS document_versions CASCADE;
DROP TABLE IF EXISTS documents CASCADE;

-- Recreate documents table (flat structure used by processDocument)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  document_group_id UUID,
  parent_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  chunk_index INT NOT NULL DEFAULT 0,
  total_chunks INT NOT NULL DEFAULT 1,
  embedding VECTOR(768),
  source_url TEXT,
  source_type TEXT NOT NULL DEFAULT 'manual',
  version INT NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_documents_tenant ON documents(tenant_id);
CREATE INDEX idx_documents_group ON documents(document_group_id);
CREATE INDEX idx_documents_active ON documents(tenant_id, active);
CREATE INDEX idx_documents_embedding ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY documents_select ON documents FOR SELECT
  USING (tenant_id = public.get_tenant_id());
CREATE POLICY documents_insert ON documents FOR INSERT
  WITH CHECK (tenant_id = public.get_tenant_id());
CREATE POLICY documents_update ON documents FOR UPDATE
  USING (tenant_id = public.get_tenant_id());
CREATE POLICY documents_delete ON documents FOR DELETE
  USING (tenant_id = public.get_tenant_id());

-- Drop ALL overloads of search_tenant_chunks (il peut y en avoir jusqu'à 3)
DROP FUNCTION IF EXISTS search_tenant_chunks(UUID, VECTOR(1536), INT, FLOAT);
DROP FUNCTION IF EXISTS search_tenant_chunks(UUID, VECTOR(768), INT, FLOAT);
DROP FUNCTION IF EXISTS search_tenant_chunks(UUID, TEXT, INT, FLOAT);

-- Search function for tenant chunks
CREATE OR REPLACE FUNCTION search_tenant_chunks(
  p_tenant_id UUID,
  p_embedding TEXT,
  p_match_count INT DEFAULT 5,
  p_similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE(
  chunk_id UUID,
  document_title TEXT,
  content TEXT,
  chunk_index INT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id AS chunk_id,
    d.title AS document_title,
    d.content,
    d.chunk_index,
    1 - (d.embedding <=> p_embedding::vector) AS similarity
  FROM documents d
  WHERE d.tenant_id = p_tenant_id
    AND d.active = true
    AND d.embedding IS NOT NULL
    AND 1 - (d.embedding <=> p_embedding::vector) > p_similarity_threshold
  ORDER BY d.embedding <=> p_embedding::vector
  LIMIT p_match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION search_tenant_chunks TO anon, authenticated, service_role;

COMMIT;
