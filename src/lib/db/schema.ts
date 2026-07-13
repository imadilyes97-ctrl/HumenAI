// ============================================================================
// HumenAI Phase 2 — Complete Database Schema
// Drizzle ORM / Prisma compatible definitions
// Multi-tenant SaaS chatbot e-commerce platform
// ============================================================================
// Generated from supabase/migrations/001_phase2_schema.sql
// Last sync: 2026-07-13
// ============================================================================

// ---------------------------------------------------------------------------
// ENUMS
// ---------------------------------------------------------------------------
export const TenantPlan = {
  Standard: "standard",
  Intermediate: "intermediate",
  Premium: "premium",
} as const;
export type TenantPlan = (typeof TenantPlan)[keyof typeof TenantPlan];

export const UserRole = {
  Admin: "admin",
  Agent: "agent",
  Readonly: "readonly",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ChannelType = {
  WhatsApp: "whatsapp",
  Instagram: "instagram",
  Messenger: "messenger",
  TikTok: "tiktok",
  Shopify: "shopify",
  WooCommerce: "woocommerce",
  Wix: "wix",
  PrestaShop: "prestashop",
  Magento: "magento",
  WebWidget: "web_widget",
  Email: "email",
} as const;
export type ChannelType = (typeof ChannelType)[keyof typeof ChannelType];

export const ChannelStatus = {
  Active: "active",
  Inactive: "inactive",
  Error: "error",
  Pending: "pending",
  Disconnected: "disconnected",
  RateLimited: "rate_limited",
} as const;
export type ChannelStatus = (typeof ChannelStatus)[keyof typeof ChannelStatus];

export const ConversationStatus = {
  Active: "active",
  WaitingHuman: "waiting_human",
  WithHuman: "with_human",
  Closed: "closed",
} as const;
export type ConversationStatus =
  (typeof ConversationStatus)[keyof typeof ConversationStatus];

export const MessageSender = {
  Customer: "customer",
  Bot: "bot",
  HumanAgent: "human_agent",
} as const;
export type MessageSender = (typeof MessageSender)[keyof typeof MessageSender];

export const MessageFormat = {
  Text: "text",
  Image: "image",
  Audio: "audio",
  Document: "document",
} as const;
export type MessageFormat = (typeof MessageFormat)[keyof typeof MessageFormat];

export const MediaAssetType = {
  Image: "image",
  Video: "video",
  Audio: "audio",
} as const;
export type MediaAssetType =
  (typeof MediaAssetType)[keyof typeof MediaAssetType];

export const TeamMemberStatus = {
  Pending: "pending",
  Accepted: "accepted",
  Declined: "declined",
  Revoked: "revoked",
} as const;
export type TeamMemberStatus =
  (typeof TeamMemberStatus)[keyof typeof TeamMemberStatus];

export const AuditAction = {
  TenantCreated: "tenant.created",
  TenantUpdated: "tenant.updated",
  TenantDeleted: "tenant.deleted",
  UserCreated: "user.created",
  UserUpdated: "user.updated",
  UserDeleted: "user.deleted",
  UserLogin: "user.login",
  UserLogout: "user.logout",
  ChannelCreated: "channel.created",
  ChannelUpdated: "channel.updated",
  ChannelDeleted: "channel.deleted",
  ChannelEnabled: "channel.enabled",
  ChannelDisabled: "channel.disabled",
  DocumentCreated: "document.created",
  DocumentUpdated: "document.updated",
  DocumentDeleted: "document.deleted",
  DocumentUploaded: "document.uploaded",
  DocumentProcessed: "document.processed",
  ConversationAssigned: "conversation.assigned",
  ConversationTransferred: "conversation.transferred",
  ConversationClosed: "conversation.closed",
  MessageSent: "message.sent",
  MessageEscalated: "message.escalated",
  MediaUploaded: "media.uploaded",
  MediaDeleted: "media.deleted",
  TeamInvited: "team.invited",
  TeamAccepted: "team.accepted",
  TeamDeclined: "team.declined",
  TeamRevoked: "team.revoked",
  SettingsUpdated: "settings.updated",
  PlanChanged: "plan.changed",
  PlanExpired: "plan.expired",
  ExportCompleted: "export.completed",
  ExportFailed: "export.failed",
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

// ---------------------------------------------------------------------------
// TABLE INTERFACES
// ---------------------------------------------------------------------------

// --- TENANTS ---
// Primary entity. Each tenant is a separate customer (e-commerce brand).
export interface TenantTable {
  id: string; // UUID
  name: string;
  slug: string; // UNIQUE
  plan: TenantPlan;
  settings: Record<string, unknown>;
  isActive: boolean;
  createdAt: string; // ISO 8601 timestamptz
  updatedAt: string;
}

// --- USERS ---
// Belongs to a tenant. A user can be in exactly one tenant.
export interface UserTable {
  id: string; // UUID
  tenantId: string; // FK -> tenants.id
  email: string; // UNIQUE (global across all tenants)
  name: string;
  role: UserRole;
  passwordHash: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// --- TENANT SETTINGS ---
// 1:1 with tenants. Auto-created on tenant insert.
// Stores all dynamic, user-configurable parameters of the chatbot.
export interface TenantSettingsTable {
  id: string; // UUID
  tenantId: string; // FK -> tenants.id, UNIQUE

  // Chatbot personality
  chatbotName: string;
  welcomeMessage: string;
  offlineMessage: string;
  tone: string;
  primaryLanguage: string;
  fallbackLanguage: string;
  supportedLanguages: string[];
  allowEmojis: boolean;
  preferredResponseLength: "short" | "medium" | "long";

  // Working hours
  timezone: string;
  businessHours: BusinessHoursJson;

  // Branding
  logoUrl: string | null;
  iconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;

  // AI behavior
  aiTemperature: number; // REAL (0.0 - 2.0)
  aiMaxTokens: number; // INT (128 - 8192)
  aiModel: string;
  maxConversationHistory: number;
  humanHandoffEnabled: boolean;
  sentimentAnalysis: boolean;

  // Lead capture
  leadCaptureEnabled: boolean;
  leadEmailRequired: boolean;
  leadPhoneRequired: boolean;

  // Notifications
  notificationEmail: string | null;
  notificationWebhookUrl: string | null;
  notificationOnNewConversation: boolean;
  notificationOnHumanRequest: boolean;
  notificationOnEscalation: boolean;

  // Feature flags
  featuresEnabled: Record<string, boolean>;

  // File attachments
  maxFileSizeMb: number;
  allowedFileTypes: string[];

  // Analytics
  analyticsRetentionDays: number;

  createdAt: string;
  updatedAt: string;
}

// --- CHANNELS ---
// Communication channel integrations (WhatsApp, Instagram, web widget, etc.)
export interface ChannelTable {
  id: string; // UUID
  tenantId: string; // FK -> tenants.id
  type: ChannelType; // UNIQUE per tenant
  enabled: boolean;
  credentials: Record<string, string>;
  settings: Record<string, unknown>;
  status: ChannelStatus;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// --- DOCUMENTS (RAG KNOWLEDGE BASE) ---
// One row per chunk. Multiple chunks grouped by document_group_id.
// Embedding column for pgvector cosine similarity search.
export interface DocumentTable {
  id: string; // UUID
  tenantId: string; // FK -> tenants.id

  // Grouping: chunks of the same original document
  documentGroupId: string | null; // UUID
  parentDocumentId: string | null; // self-referencing FK

  title: string;
  content: string;
  chunkIndex: number;
  totalChunks: number;

  // pgvector embedding (OpenAI 1536-dim)
  embedding: number[] | null; // vector(1536) — stored as number[] in TS

  // Source tracking
  sourceUrl: string | null;
  sourceType: "manual" | "import" | "web_scrape" | "api" | "integration";

  // Versioning
  version: number;
  active: boolean;

  // Metadata
  metadata: Record<string, unknown>;

  createdAt: string;
  updatedAt: string;
}

// --- MEDIA ASSETS ---
// Files uploaded via Cloudinary (images, videos, audio).
export interface MediaAssetTable {
  id: string; // UUID
  tenantId: string; // FK -> tenants.id
  uploadedBy: string | null; // FK -> users.id

  // Cloudinary identifiers
  publicId: string;
  url: string;
  secureUrl: string;

  // Type info
  assetType: MediaAssetType;
  format: string;
  bytes: number;

  // Media dimensions
  width: number | null;
  height: number | null;
  duration: number | null; // seconds

  // Usage
  altText: string | null;
  tags: string[];

  // Cloudinary raw metadata
  metadata: Record<string, unknown>;

  createdAt: string;
}

// --- TEAM MEMBERS ---
// Links users to tenants with a specific role.
// The users table row is always created first, then team_members assigns role.
export interface TeamMemberTable {
  id: string; // UUID
  tenantId: string; // FK -> tenants.id
  userId: string; // FK -> users.id, UNIQUE per tenant
  role: UserRole;
  invitedBy: string | null; // FK -> users.id
  status: TeamMemberStatus;
  permissions: Record<string, boolean>;
  invitedAt: string;
  acceptedAt: string | null;
}

// --- CONVERSATIONS ---
// A conversation thread between a customer and the bot/human agent.
export interface ConversationTable {
  id: string; // UUID
  tenantId: string; // FK -> tenants.id
  channelId: string; // FK -> channels.id
  channelType: string;
  customerId: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  status: ConversationStatus;
  assignedTo: string | null; // FK -> users.id
  metadata: Record<string, unknown>;
  lastMessageAt: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

// --- MESSAGES ---
// Individual messages within a conversation.
// No tenant_id column — access is gated through the parent conversation.
export interface MessageTable {
  id: string; // UUID
  conversationId: string; // FK -> conversations.id
  sender: MessageSender;
  format: MessageFormat;
  content: string;
  agentId: string | null; // FK -> users.id (when sender = human_agent)
  mediaAssetId: string | null; // FK -> media_assets.id
  metadata: Record<string, unknown>;
  createdAt: string;
}

// --- ANALYTICS EVENTS ---
// Event-sourced analytics for dashboards and reporting.
export interface AnalyticsEventTable {
  id: string; // UUID
  tenantId: string; // FK -> tenants.id
  eventType: string;
  sessionId: string | null;
  data: Record<string, unknown>;
  createdAt: string;
}

// --- AUDIT LOGS ---
// Immutable audit trail for security and compliance.
export interface AuditLogTable {
  id: string; // UUID
  tenantId: string; // FK -> tenants.id
  userId: string | null; // FK -> users.id
  action: AuditAction;
  entityType: string | null;
  entityId: string | null;
  details: Record<string, unknown>;
  ipAddress: string | null; // INET stored as string
  createdAt: string;
}

// ---------------------------------------------------------------------------
// SUPPORTING TYPES
// ---------------------------------------------------------------------------

export interface BusinessHoursJson {
  enabled: boolean;
  timezone?: string;
  hours: Record<
    number, // day of week (0=Sunday, 6=Saturday)
    { open: string; close: string } | null
  >;
}

export interface ConversationMetadata {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  language?: string;
  sentiment?: {
    overall: number; // -1 to 1
    frustration: number; // 0 to 1
    urgency: number; // 0 to 1
  };
  orderId?: string;
  referrer?: string;
}

export interface DocumentMetadata {
  tokenCount?: number;
  pageNumber?: number;
  language?: string;
  originalFileName?: string;
  fileType?: string;
  importedAt?: string;
  checksum?: string;
}

// ---------------------------------------------------------------------------
// DRIZZLE ORM SCHEMA (uncomment when Drizzle is installed)
// ---------------------------------------------------------------------------
/*
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  real,
  jsonb,
  vector,
  uniqueIndex,
  index,
  foreignKey,
  check,
  pgEnum,
  inet,
} from "drizzle-orm/pg-core";

// ── Enums ──
export const tenantPlan = pgEnum("tenant_plan", [
  "standard",
  "intermediate",
  "premium",
]);
export const userRole = pgEnum("user_role", ["admin", "agent", "readonly"]);
export const channelType = pgEnum("channel_type", [
  "whatsapp",
  "instagram",
  "messenger",
  "tiktok",
  "shopify",
  "woocommerce",
  "wix",
  "prestashop",
  "magento",
  "web_widget",
  "email",
]);
export const channelStatus = pgEnum("channel_status", [
  "active",
  "inactive",
  "error",
  "pending",
  "disconnected",
  "rate_limited",
]);
export const conversationStatus = pgEnum("conversation_status", [
  "active",
  "waiting_human",
  "with_human",
  "closed",
]);
export const messageSender = pgEnum("message_sender", [
  "customer",
  "bot",
  "human_agent",
]);
export const messageFormat = pgEnum("message_format", [
  "text",
  "image",
  "audio",
  "document",
]);
export const mediaAssetType = pgEnum("media_asset_type", [
  "image",
  "video",
  "audio",
]);
export const teamMemberStatus = pgEnum("team_member_status", [
  "pending",
  "accepted",
  "declined",
  "revoked",
]);
export const auditAction = pgEnum("audit_action", [
  "tenant.created",
  "tenant.updated",
  "tenant.deleted",
  "user.created",
  "user.updated",
  "user.deleted",
  "user.login",
  "user.logout",
  "channel.created",
  "channel.updated",
  "channel.deleted",
  "channel.enabled",
  "channel.disabled",
  "document.created",
  "document.updated",
  "document.deleted",
  "document.uploaded",
  "document.processed",
  "conversation.assigned",
  "conversation.transferred",
  "conversation.closed",
  "message.sent",
  "message.escalated",
  "media.uploaded",
  "media.deleted",
  "team.invited",
  "team.accepted",
  "team.declined",
  "team.revoked",
  "settings.updated",
  "plan.changed",
  "plan.expired",
  "export.completed",
  "export.failed",
]);

// ── Tables ──
export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    plan: tenantPlan("plan").notNull().default("standard"),
    settings: jsonb("settings").notNull().default({}),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    slugIdx: uniqueIndex("idx_tenants_slug").on(table.slug),
  })
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    name: text("name").notNull(),
    role: userRole("role").notNull().default("agent"),
    passwordHash: text("password_hash"),
    avatarUrl: text("avatar_url"),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    emailIdx: uniqueIndex("idx_users_email").on(table.email),
    tenantIdx: index("idx_users_tenant_id").on(table.tenantId),
    tenantRoleIdx: index("idx_users_tenant_role").on(
      table.tenantId,
      table.role
    ),
  })
);

export const tenantSettings = pgTable(
  "tenant_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    chatbotName: text("chatbot_name").notNull().default("HumenAI Assistant"),
    welcomeMessage: text("welcome_message")
      .notNull()
      .default("Hello! How can I help you today?"),
    offlineMessage: text("offline_message")
      .notNull()
      .default("We are currently offline. Leave a message and we will get back to you."),
    tone: text("tone").notNull().default("professional"),
    primaryLanguage: text("primary_language").notNull().default("en"),
    fallbackLanguage: text("fallback_language").notNull().default("en"),
    supportedLanguages: text("supported_languages")
      .array()
      .notNull()
      .default("{en}"),
    allowEmojis: boolean("allow_emojis").notNull().default(true),
    preferredResponseLength: text("preferred_response_length")
      .notNull()
      .default("medium"),
    timezone: text("timezone").notNull().default("UTC"),
    businessHours: jsonb("business_hours")
      .notNull()
      .default({ enabled: false, hours: {} }),
    logoUrl: text("logo_url"),
    iconUrl: text("icon_url"),
    primaryColor: text("primary_color").notNull().default("#6366f1"),
    secondaryColor: text("secondary_color").notNull().default("#4f46e5"),
    fontFamily: text("font_family").notNull().default("Inter"),
    aiTemperature: real("ai_temperature").notNull().default(0.7),
    aiMaxTokens: integer("ai_max_tokens").notNull().default(512),
    aiModel: text("ai_model").notNull().default("gpt-4o-mini"),
    maxConversationHistory: integer("max_conversation_history")
      .notNull()
      .default(50),
    humanHandoffEnabled: boolean("human_handoff_enabled").notNull().default(true),
    sentimentAnalysis: boolean("sentiment_analysis").notNull().default(false),
    leadCaptureEnabled: boolean("lead_capture_enabled").notNull().default(true),
    leadEmailRequired: boolean("lead_email_required").notNull().default(false),
    leadPhoneRequired: boolean("lead_phone_required").notNull().default(false),
    notificationEmail: text("notification_email"),
    notificationWebhookUrl: text("notification_webhook_url"),
    notificationOnNewConversation: boolean("notification_on_new_conversation")
      .notNull()
      .default(true),
    notificationOnHumanRequest: boolean("notification_on_human_request")
      .notNull()
      .default(true),
    notificationOnEscalation: boolean("notification_on_escalation")
      .notNull()
      .default(true),
    featuresEnabled: jsonb("features_enabled").notNull().default({}),
    maxFileSizeMb: integer("max_file_size_mb").notNull().default(10),
    allowedFileTypes: text("allowed_file_types")
      .array()
      .notNull()
      .default("{pdf,docx,txt,jpg,png,mp4,mp3}"),
    analyticsRetentionDays: integer("analytics_retention_days")
      .notNull()
      .default(90),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tenantIdx: uniqueIndex("idx_tenant_settings_tenant").on(table.tenantId),
  })
);

export const channels = pgTable(
  "channels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    type: channelType("type").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    credentials: jsonb("credentials").notNull().default({}),
    settings: jsonb("settings").notNull().default({}),
    status: channelStatus("status").notNull().default("inactive"),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tenantTypeIdx: uniqueIndex("uq_channel_type_per_tenant").on(
      table.tenantId,
      table.type
    ),
    tenantIdx: index("idx_channels_tenant_id").on(table.tenantId),
  })
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    documentGroupId: uuid("document_group_id"),
    parentDocumentId: uuid("parent_document_id"),
    title: text("title").notNull(),
    content: text("content").notNull(),
    chunkIndex: integer("chunk_index").notNull().default(0),
    totalChunks: integer("total_chunks").notNull().default(1),
    embedding: vector("embedding", { dimensions: 1536 }),
    sourceUrl: text("source_url"),
    sourceType: text("source_type").notNull().default("manual"),
    version: integer("version").notNull().default(1),
    active: boolean("active").notNull().default(true),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tenantActiveIdx: index("idx_documents_tenant_active").on(
      table.tenantId,
      table.active
    ),
    groupIdx: index("idx_documents_group_id").on(table.documentGroupId),
    embeddingIdx: index("idx_documents_embedding").using(
      "ivfflat",
      table.embedding,
      { ops: "vector_cosine_ops", lists: 100 }
    ),
  })
);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    uploadedBy: uuid("uploaded_by"),
    publicId: text("public_id").notNull(),
    url: text("url").notNull(),
    secureUrl: text("secure_url").notNull(),
    assetType: mediaAssetType("asset_type").notNull(),
    format: text("format").notNull(),
    bytes: integer("bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    duration: real("duration"),
    altText: text("alt_text"),
    tags: text("tags").array().notNull().default({}),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tenantPublicIdIdx: uniqueIndex("uq_media_public_id_per_tenant").on(
      table.tenantId,
      table.publicId
    ),
    tenantCreatedIdx: index("idx_media_assets_tenant_created").on(
      table.tenantId,
      table.createdAt
    ),
  })
);

export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: userRole("role").notNull().default("agent"),
    invitedBy: uuid("invited_by"),
    status: teamMemberStatus("status").notNull().default("pending"),
    permissions: jsonb("permissions").notNull().default({}),
    invitedAt: timestamp("invited_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  },
  (table) => ({
    tenantUserIdx: uniqueIndex("uq_team_member_per_tenant").on(
      table.tenantId,
      table.userId
    ),
    statusIdx: index("idx_team_members_status").on(table.tenantId, table.status),
  })
);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    channelType: text("channel_type").notNull(),
    customerId: text("customer_id").notNull(),
    customerName: text("customer_name"),
    customerEmail: text("customer_email"),
    customerPhone: text("customer_phone"),
    status: conversationStatus("status").notNull().default("active"),
    assignedTo: uuid("assigned_to"),
    metadata: jsonb("metadata").notNull().default({}),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    messageCount: integer("message_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tenantStatusIdx: index("idx_conversations_tenant_status").on(
      table.tenantId,
      table.status
    ),
    customerIdx: index("idx_conversations_customer").on(
      table.channelId,
      table.customerId
    ),
  })
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    sender: messageSender("sender").notNull(),
    format: messageFormat("format").notNull().default("text"),
    content: text("content").notNull(),
    agentId: uuid("agent_id"),
    mediaAssetId: uuid("media_asset_id"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    conversationIdx: index("idx_messages_conversation").on(
      table.conversationId,
      table.createdAt
    ),
  })
);

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    sessionId: text("session_id"),
    data: jsonb("data").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tenantEventIdx: index("idx_analytics_tenant_event").on(
      table.tenantId,
      table.eventType
    ),
  })
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id"),
    action: auditAction("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    details: jsonb("details").notNull().default({}),
    ipAddress: inet("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tenantCreatedIdx: index("idx_audit_logs_tenant_created").on(
      table.tenantId,
      table.createdAt
    ),
    actionIdx: index("idx_audit_logs_action").on(table.action),
  })
);
*/
