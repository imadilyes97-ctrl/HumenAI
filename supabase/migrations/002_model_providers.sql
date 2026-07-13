-- HumenAI — Migration 002 : Model Providers (Multi-model orchestration)
-- Execute après 001_phase2_schema.sql dans Supabase SQL Editor

BEGIN;

CREATE TYPE ai_provider AS ENUM ('openai','anthropic','google','mistral','deepseek','openrouter');
CREATE TYPE model_capability AS ENUM ('text','vision','audio');

CREATE TABLE model_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider ai_provider NOT NULL,
  label TEXT NOT NULL,
  api_key TEXT NOT NULL,                    -- chiffré en production via Vault
  models TEXT[] NOT NULL DEFAULT '{}',      -- ex: {"gpt-4o","gpt-4o-mini"}
  capabilities model_capability[] NOT NULL DEFAULT '{"text"}',
  default_model TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INT NOT NULL DEFAULT 1,          -- ordre de fallback
  last_used_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, provider)
);

CREATE INDEX idx_model_providers_tenant ON model_providers(tenant_id);
CREATE INDEX idx_model_providers_active ON model_providers(tenant_id, is_active);

CREATE OR REPLACE FUNCTION update_model_providers_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER model_providers_updated_at
  BEFORE UPDATE ON model_providers FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE model_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY model_providers_select ON model_providers FOR SELECT
  USING (tenant_id = auth.current_tenant_id());
CREATE POLICY model_providers_insert ON model_providers FOR INSERT
  WITH CHECK (tenant_id = auth.current_tenant_id());
CREATE POLICY model_providers_update ON model_providers FOR UPDATE
  USING (tenant_id = auth.current_tenant_id());
CREATE POLICY model_providers_delete ON model_providers FOR DELETE
  USING (tenant_id = auth.current_tenant_id());

COMMIT;
