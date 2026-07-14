-- HumenAI — Migration 006 + 007 combinée : Fix documents + search function
-- COLLE TOUT DANS SQL EDITOR ET EXÉCUTE EN UNE FOIS
-- ATTENTION : supprime les tables document_chunks, document_versions, documents

BEGIN;

-- 1. Supprimer TOUS les overloads de search_tenant_chunks (n'importe quelle signature)
DO $$ DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT p.oid FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'search_tenant_chunks'
  LOOP
    EXECUTE 'DROP FUNCTION ' || r.oid::regproc || ' CASCADE';
  END LOOP;
END $$;

-- 2. Supprimer les anciennes tables
DROP TABLE IF EXISTS document_chunks CASCADE;
DROP TABLE IF EXISTS document_versions CASCADE;
DROP TABLE IF EXISTS documents CASCADE;

-- 3. Créer la table documents (structure plate utilisée par le code)
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

-- 4. Indexes
CREATE INDEX idx_documents_tenant ON documents(tenant_id);
CREATE INDEX idx_documents_group ON documents(document_group_id);
CREATE INDEX idx_documents_active ON documents(tenant_id, active);
CREATE INDEX idx_documents_embedding ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 5. RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY documents_select ON documents FOR SELECT
  USING (tenant_id = public.get_tenant_id());
CREATE POLICY documents_insert ON documents FOR INSERT
  WITH CHECK (tenant_id = public.get_tenant_id());
CREATE POLICY documents_update ON documents FOR UPDATE
  USING (tenant_id = public.get_tenant_id());
CREATE POLICY documents_delete ON documents FOR DELETE
  USING (tenant_id = public.get_tenant_id());

-- 6. Fonction de recherche RAG
CREATE OR REPLACE FUNCTION search_tenant_chunks(
  p_tenant_id UUID,
  p_embedding TEXT,
  p_match_count INT DEFAULT 5,
  p_similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE(chunk_id UUID, document_title TEXT, content TEXT, chunk_index INT, similarity FLOAT)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT d.id, d.title, d.content, d.chunk_index,
         1 - (d.embedding <=> p_embedding::vector) AS similarity
  FROM documents d
  WHERE d.tenant_id = p_tenant_id
    AND d.active = true
    AND d.embedding IS NOT NULL
    AND 1 - (d.embedding <=> p_embedding::vector) > p_similarity_threshold
  ORDER BY d.embedding <=> p_embedding::vector
  LIMIT p_match_count;
END;$$;

GRANT EXECUTE ON FUNCTION search_tenant_chunks TO anon, authenticated, service_role;

COMMIT;
