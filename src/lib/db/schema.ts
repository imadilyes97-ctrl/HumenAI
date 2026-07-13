// HumenAI — Database schema definitions
// Placeholder for Drizzle ORM / Prisma schema generation

/*
=== TABLES ===

tenants
  id            uuid PK
  name          text
  slug          text UNIQUE
  plan          enum: standard | intermediate | premium
  settings      jsonb (TenantSettings)
  created_at    timestamptz
  updated_at    timestamptz

users
  id            uuid PK
  tenant_id     uuid FK → tenants
  email         text UNIQUE
  name          text
  role          enum: admin | agent | readonly
  password_hash text
  created_at    timestamptz

channels
  id            uuid PK
  tenant_id     uuid FK → tenants
  type          enum: whatsapp | instagram | messenger | tiktok | shopify | ...
  enabled       boolean
  credentials   jsonb (encrypted)
  settings      jsonb
  status        enum
  created_at    timestamptz

conversations
  id            uuid PK
  tenant_id     uuid FK → tenants
  channel_id    uuid FK → channels
  channel_type  text
  customer_id   text
  status        enum: active | waiting_human | with_human | closed
  assigned_to   uuid FK → users (nullable)
  metadata      jsonb
  created_at    timestamptz
  updated_at    timestamptz

messages
  id            uuid PK
  conversation_id uuid FK → conversations
  sender        enum: customer | bot | human_agent
  format        enum: text | image | audio | document
  content       text
  metadata      jsonb
  created_at    timestamptz

documents (RAG knowledge base)
  id            uuid PK
  tenant_id     uuid FK → tenants
  title         text
  content       text
  version       int
  embedding     vector(1536) (pgvector)
  active        boolean
  created_at    timestamptz

analytics_events
  id            uuid PK
  tenant_id     uuid FK → tenants
  event_type    text
  data          jsonb
  created_at    timestamptz

audit_logs
  id            uuid PK
  tenant_id     uuid FK → tenants
  user_id       uuid FK → users
  action        text
  details       jsonb
  created_at    timestamptz

=== INDEXES ===
- tenants.slug (unique)
- conversations(tenant_id, status)
- messages(conversation_id, created_at)
- documents(tenant_id, active)
- analytics_events(tenant_id, event_type, created_at)
*/
