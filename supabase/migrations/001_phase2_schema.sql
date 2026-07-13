-- HumenAI — Phase 2 : Migration Supabase
-- Execute dans Supabase SQL Editor

BEGIN;

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE tenant_plan AS ENUM ('standard','intermediate','premium');
CREATE TYPE user_role AS ENUM ('admin','agent','readonly');
CREATE TYPE channel_type AS ENUM ('whatsapp','instagram','messenger','tiktok','shopify','woocommerce','wix','prestashop','magento','web_widget','email');
CREATE TYPE channel_status AS ENUM ('active','disconnected','rate_limited','error','pending');
CREATE TYPE conversation_status AS ENUM ('active','waiting_human','with_human','closed');
CREATE TYPE message_sender AS ENUM ('customer','bot','human_agent');
CREATE TYPE message_format AS ENUM ('text','image','audio','document');
CREATE TYPE document_status AS ENUM ('processing','ready','error','archived');
CREATE TYPE media_type AS ENUM ('image','video','audio');
CREATE TYPE brand_tone AS ENUM ('professional','friendly','humorous','direct');

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan tenant_plan NOT NULL DEFAULT 'standard',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  chatbot_name TEXT NOT NULL DEFAULT 'Assistant',
  brand_tone brand_tone NOT NULL DEFAULT 'friendly',
  company_mission TEXT DEFAULT '',
  language_rules TEXT DEFAULT '',
  primary_language TEXT NOT NULL DEFAULT 'fr',
  supported_languages TEXT[] NOT NULL DEFAULT ARRAY['fr'],
  fallback_language TEXT NOT NULL DEFAULT 'fr',
  allow_emojis BOOLEAN NOT NULL DEFAULT true,
  preferred_response_length TEXT NOT NULL DEFAULT 'medium' CHECK (preferred_response_length IN ('short','medium','long')),
  greeting_message TEXT NOT NULL DEFAULT 'Bonjour ! Je suis votre assistant.',
  fallback_message TEXT NOT NULL DEFAULT 'Je suis desole, je ne peux pas repondre a cette question.',
  business_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  business_hours_timezone TEXT NOT NULL DEFAULT 'Africa/Algiers',
  similarity_threshold NUMERIC(4,3) NOT NULL DEFAULT 0.75,
  max_chunks INT NOT NULL DEFAULT 5,
  ai_model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  ai_temperature NUMERIC(3,2) NOT NULL DEFAULT 0.3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'agent',
  password_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);

CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type channel_type NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  credentials JSONB NOT NULL DEFAULT '{}',
  settings JSONB NOT NULL DEFAULT '{}',
  status channel_status NOT NULL DEFAULT 'disconnected',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, type)
);
CREATE INDEX idx_channels_tenant ON channels(tenant_id);

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES channels(id) ON DELETE SET NULL,
  channel_type channel_type NOT NULL,
  customer_id TEXT NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  language TEXT NOT NULL DEFAULT 'fr',
  status conversation_status NOT NULL DEFAULT 'active',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  sentiment JSONB DEFAULT '{"overall":0,"frustration":0,"urgency":0}',
  metadata JSONB DEFAULT '{}',
  message_count INT NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX idx_conversations_status ON conversations(tenant_id, status);
CREATE INDEX idx_conversations_customer ON conversations(tenant_id, customer_id);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sender message_sender NOT NULL,
  format message_format NOT NULL DEFAULT 'text',
  content TEXT NOT NULL,
  media_url TEXT,
  tokens_prompt INT,
  tokens_completion INT,
  latency_ms INT,
  sources JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_tenant ON messages(tenant_id);

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('pdf','txt','md','html','csv','json')),
  cloudinary_public_id TEXT,
  cloudinary_url TEXT,
  status document_status NOT NULL DEFAULT 'processing',
  current_version INT NOT NULL DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_documents_tenant ON documents(tenant_id);
CREATE INDEX idx_documents_status ON documents(tenant_id, status);

CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  version INT NOT NULL,
  content_hash TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  char_count INT NOT NULL DEFAULT 0,
  token_count INT NOT NULL DEFAULT 0,
  chunk_count INT NOT NULL DEFAULT 0,
  change_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(document_id, version)
);
CREATE INDEX idx_doc_versions_document ON document_versions(document_id);

CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  document_version_id UUID NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  token_count INT NOT NULL,
  heading TEXT,
  char_start INT,
  char_end INT,
  embedding VECTOR(1536),
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_chunks_tenant ON document_chunks(tenant_id);
CREATE INDEX idx_chunks_document ON document_chunks(document_id);
CREATE INDEX idx_chunks_active ON document_chunks(tenant_id, is_active);
CREATE INDEX idx_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE TABLE media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  type media_type NOT NULL,
  format TEXT NOT NULL,
  url TEXT NOT NULL,
  secure_url TEXT NOT NULL,
  public_id TEXT NOT NULL,
  bytes INT NOT NULL,
  width INT,
  height INT,
  duration NUMERIC(10,3),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_media_tenant ON media_assets(tenant_id);

CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_analytics_tenant ON analytics_events(tenant_id);
CREATE INDEX idx_analytics_type ON analytics_events(tenant_id, event_type);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_tenant ON audit_logs(tenant_id);

-- RAG function
CREATE OR REPLACE FUNCTION search_tenant_chunks(
  p_tenant_id UUID,
  p_embedding VECTOR(1536),
  p_match_count INT DEFAULT 20,
  p_similarity_threshold FLOAT DEFAULT 0.75
)
RETURNS TABLE(chunk_id UUID, content TEXT, document_title TEXT, document_id UUID, chunk_index INT, heading TEXT, similarity FLOAT, token_count INT)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT dc.id, dc.content, d.title, dc.document_id, dc.chunk_index, dc.heading,
         1 - (dc.embedding <=> p_embedding) AS similarity_score, dc.token_count
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

-- Triggers
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tenant_settings_updated_at BEFORE UPDATE ON tenant_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER channels_updated_at BEFORE UPDATE ON channels FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION create_tenant_settings() RETURNS TRIGGER AS $$
BEGIN INSERT INTO tenant_settings (tenant_id) VALUES (NEW.id); RETURN NEW; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER after_tenant_insert AFTER INSERT ON tenants FOR EACH ROW EXECUTE FUNCTION create_tenant_settings();

CREATE OR REPLACE FUNCTION update_conversation_on_message() RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET message_count = message_count + 1, last_message_at = NEW.created_at, updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER after_message_insert AFTER INSERT ON messages FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();

-- Row Level Security
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION auth.current_tenant_id() RETURNS UUID
LANGUAGE SQL STABLE AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id')::UUID,
    (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::UUID
  );
$$;

CREATE POLICY tenant_select ON tenants FOR SELECT USING (id = auth.current_tenant_id());
CREATE POLICY tenant_update ON tenants FOR UPDATE USING (id = auth.current_tenant_id());
CREATE POLICY settings_select ON tenant_settings FOR SELECT USING (tenant_id = auth.current_tenant_id());
CREATE POLICY settings_update ON tenant_settings FOR UPDATE USING (tenant_id = auth.current_tenant_id());
CREATE POLICY channels_select ON channels FOR SELECT USING (tenant_id = auth.current_tenant_id());
CREATE POLICY channels_insert ON channels FOR INSERT WITH CHECK (tenant_id = auth.current_tenant_id());
CREATE POLICY channels_update ON channels FOR UPDATE USING (tenant_id = auth.current_tenant_id());
CREATE POLICY conversations_select ON conversations FOR SELECT USING (tenant_id = auth.current_tenant_id());
CREATE POLICY conversations_insert ON conversations FOR INSERT WITH CHECK (tenant_id = auth.current_tenant_id());
CREATE POLICY conversations_update ON conversations FOR UPDATE USING (tenant_id = auth.current_tenant_id());
CREATE POLICY messages_select ON messages FOR SELECT USING (tenant_id = auth.current_tenant_id());
CREATE POLICY messages_insert ON messages FOR INSERT WITH CHECK (tenant_id = auth.current_tenant_id());
CREATE POLICY documents_select ON documents FOR SELECT USING (tenant_id = auth.current_tenant_id());
CREATE POLICY documents_insert ON documents FOR INSERT WITH CHECK (tenant_id = auth.current_tenant_id());
CREATE POLICY documents_update ON documents FOR UPDATE USING (tenant_id = auth.current_tenant_id());
CREATE POLICY chunks_select ON document_chunks FOR SELECT USING (tenant_id = auth.current_tenant_id());
CREATE POLICY chunks_insert ON document_chunks FOR INSERT WITH CHECK (tenant_id = auth.current_tenant_id());
CREATE POLICY media_select ON media_assets FOR SELECT USING (tenant_id = auth.current_tenant_id());
CREATE POLICY media_insert ON media_assets FOR INSERT WITH CHECK (tenant_id = auth.current_tenant_id());
CREATE POLICY analytics_select ON analytics_events FOR SELECT USING (tenant_id = auth.current_tenant_id());
CREATE POLICY analytics_insert ON analytics_events FOR INSERT WITH CHECK (tenant_id = auth.current_tenant_id());
CREATE POLICY audit_select ON audit_logs FOR SELECT USING (tenant_id = auth.current_tenant_id());

COMMIT;
