-- HumenAI — Fix : Supprimer les anciennes versions de search_tenant_chunks
-- Exécute CES DEUX LIGNES dans Supabase SQL Editor :

DROP FUNCTION IF EXISTS search_tenant_chunks(UUID, TEXT, INT, NUMERIC);
DROP FUNCTION IF EXISTS search_tenant_chunks(UUID, TEXT, INT, FLOAT);
