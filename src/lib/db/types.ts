// ============================================================================
// HumenAI Phase 2 — TypeScript types + Zod validation schemas
// Multi-tenant SaaS chatbot e-commerce platform
// ============================================================================

import { z } from "zod";

// ---------------------------------------------------------------------------
// ENUM SCHEMAS
// ---------------------------------------------------------------------------
export const TenantPlanSchema = z.enum([
  "standard",
  "intermediate",
  "premium",
]);
export type TenantPlan = z.infer<typeof TenantPlanSchema>;

export const UserRoleSchema = z.enum(["admin", "agent", "readonly"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const ChannelTypeSchema = z.enum([
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
export type ChannelType = z.infer<typeof ChannelTypeSchema>;

export const ChannelStatusSchema = z.enum([
  "active",
  "inactive",
  "error",
  "pending",
  "disconnected",
  "rate_limited",
]);
export type ChannelStatus = z.infer<typeof ChannelStatusSchema>;

export const ConversationStatusSchema = z.enum([
  "active",
  "waiting_human",
  "with_human",
  "closed",
]);
export type ConversationStatus = z.infer<typeof ConversationStatusSchema>;

export const MessageSenderSchema = z.enum([
  "customer",
  "bot",
  "human_agent",
]);
export type MessageSender = z.infer<typeof MessageSenderSchema>;

export const MessageFormatSchema = z.enum([
  "text",
  "image",
  "audio",
  "document",
]);
export type MessageFormat = z.infer<typeof MessageFormatSchema>;

export const MediaAssetTypeSchema = z.enum(["image", "video", "audio"]);
export type MediaAssetType = z.infer<typeof MediaAssetTypeSchema>;

export const TeamMemberStatusSchema = z.enum([
  "pending",
  "accepted",
  "declined",
  "revoked",
]);
export type TeamMemberStatus = z.infer<typeof TeamMemberStatusSchema>;

// ---------------------------------------------------------------------------
// TENANT SETTINGS — Full schema with validation
// ---------------------------------------------------------------------------

export const BusinessHoursSchema = z.object({
  enabled: z.boolean(),
  timezone: z.string().optional(),
  hours: z.record(
    z.string(), // "0".."6" for day of week
    z
      .object({
        open: z.string().regex(/^\d{2}:\d{2}$/),
        close: z.string().regex(/^\d{2}:\d{2}$/),
      })
      .nullable()
  ),
});
export type BusinessHours = z.infer<typeof BusinessHoursSchema>;

export const ToneSchema = z.enum([
  "professional",
  "friendly",
  "humorous",
  "direct",
]);
export type Tone = z.infer<typeof ToneSchema>;

export const ResponseLengthSchema = z.enum(["short", "medium", "long"]);
export type ResponseLength = z.infer<typeof ResponseLengthSchema>;

export const TenantSettingsUpdateSchema = z.object({
  // Chatbot personality
  chatbotName: z.string().min(1).max(100).optional(),
  welcomeMessage: z.string().min(1).max(2000).optional(),
  offlineMessage: z.string().min(1).max(2000).optional(),
  tone: ToneSchema.optional(),
  primaryLanguage: z.string().min(2).max(10).optional(),
  fallbackLanguage: z.string().min(2).max(10).optional(),
  supportedLanguages: z.array(z.string().min(2).max(10)).min(1).optional(),
  allowEmojis: z.boolean().optional(),
  preferredResponseLength: ResponseLengthSchema.optional(),

  // Working hours
  timezone: z.string().min(1).max(64).optional(),
  businessHours: BusinessHoursSchema.optional(),

  // Branding
  logoUrl: z.string().url().nullable().optional(),
  iconUrl: z.string().url().nullable().optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  secondaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  fontFamily: z.string().min(1).max(100).optional(),

  // AI behavior
  aiTemperature: z.number().min(0).max(2).optional(),
  aiMaxTokens: z.number().int().min(128).max(8192).optional(),
  aiModel: z.string().min(1).max(100).optional(),
  maxConversationHistory: z.number().int().min(1).max(500).optional(),
  humanHandoffEnabled: z.boolean().optional(),
  sentimentAnalysis: z.boolean().optional(),

  // Lead capture
  leadCaptureEnabled: z.boolean().optional(),
  leadEmailRequired: z.boolean().optional(),
  leadPhoneRequired: z.boolean().optional(),

  // Notifications
  notificationEmail: z.string().email().nullable().optional(),
  notificationWebhookUrl: z.string().url().nullable().optional(),
  notificationOnNewConversation: z.boolean().optional(),
  notificationOnHumanRequest: z.boolean().optional(),
  notificationOnEscalation: z.boolean().optional(),

  // File attachments
  maxFileSizeMb: z.number().int().min(1).max(100).optional(),
  allowedFileTypes: z.array(z.string().min(1)).optional(),

  // Analytics
  analyticsRetentionDays: z.number().int().min(30).max(365).optional(),
});
export type TenantSettingsUpdate = z.infer<typeof TenantSettingsUpdateSchema>;

// ---------------------------------------------------------------------------
// DOCUMENTS (RAG) — Types for knowledge base operations
// ---------------------------------------------------------------------------

export const DocumentSourceTypeSchema = z.enum([
  "manual",
  "import",
  "web_scrape",
  "api",
  "integration",
]);
export type DocumentSourceType = z.infer<typeof DocumentSourceTypeSchema>;

export const DocumentMetadataSchema = z.object({
  tokenCount: z.number().int().nonnegative().optional(),
  pageNumber: z.number().int().nonnegative().optional(),
  language: z.string().optional(),
  originalFileName: z.string().optional(),
  fileType: z.string().optional(),
  importedAt: z.string().datetime().optional(),
  checksum: z.string().optional(),
});
export type DocumentMetadata = z.infer<typeof DocumentMetadataSchema>;

export const DocumentChunkSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  documentGroupId: z.string().uuid().nullable(),
  title: z.string().min(1).max(500),
  content: z.string().min(1),
  chunkIndex: z.number().int().nonnegative(),
  totalChunks: z.number().int().positive(),
  embedding: z.array(z.number()).nullable(),
  sourceUrl: z.string().url().nullable(),
  sourceType: DocumentSourceTypeSchema,
  version: z.number().int().positive(),
  active: z.boolean(),
  metadata: DocumentMetadataSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type DocumentChunk = z.infer<typeof DocumentChunkSchema>;

/** Payload for inserting a new document (before chunking + embedding). */
export const DocumentCreateSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(1),
  sourceUrl: z.string().url().nullable().optional(),
  sourceType: DocumentSourceTypeSchema.optional().default("manual"),
  metadata: DocumentMetadataSchema.optional().default({}),
});
export type DocumentCreate = z.infer<typeof DocumentCreateSchema>;

/** Result from semantic search across document embeddings. */
export interface DocumentSearchResult {
  chunk: DocumentChunk;
  similarity: number; // cosine similarity (0..1)
  tenantId: string;
}

// ---------------------------------------------------------------------------
// MEDIA ASSETS — Types for Cloudinary-backed file management
// ---------------------------------------------------------------------------

export const MediaAssetMetadataSchema = z.object({
  originalFilename: z.string().optional(),
  cloudinaryContext: z.record(z.unknown()).optional(),
  isAiGenerated: z.boolean().optional(),
});
export type MediaAssetMetadata = z.infer<typeof MediaAssetMetadataSchema>;

export const MediaAssetSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  uploadedBy: z.string().uuid().nullable(),
  publicId: z.string().min(1),
  url: z.string().url(),
  secureUrl: z.string().url(),
  assetType: MediaAssetTypeSchema,
  format: z.string().min(1),
  bytes: z.number().int().nonnegative(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  duration: z.number().nonnegative().nullable(),
  altText: z.string().nullable(),
  tags: z.array(z.string()),
  metadata: MediaAssetMetadataSchema,
  createdAt: z.string().datetime(),
});
export type MediaAsset = z.infer<typeof MediaAssetSchema>;

/** Payload for recording a Cloudinary upload in the database. */
export const MediaAssetCreateSchema = z.object({
  publicId: z.string().min(1),
  url: z.string().url(),
  secureUrl: z.string().url(),
  assetType: MediaAssetTypeSchema,
  format: z.string().min(1),
  bytes: z.number().int().nonnegative(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  duration: z.number().nonnegative().nullable().optional(),
  altText: z.string().nullable().optional(),
  tags: z.array(z.string()).optional().default([]),
  metadata: MediaAssetMetadataSchema.optional().default({}),
});
export type MediaAssetCreate = z.infer<typeof MediaAssetCreateSchema>;

/** Output from the Cloudinary upload process, ready for DB insert. */
export interface CloudinaryUploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
  duration?: number;
  assetType: MediaAssetType;
}

// ---------------------------------------------------------------------------
// TEAM MEMBERS — Types for invitation and team management
// ---------------------------------------------------------------------------

export const TeamMemberPermissionsSchema = z.object({
  canManageChannels: z.boolean().optional().default(false),
  canManageTeam: z.boolean().optional().default(false),
  canViewAnalytics: z.boolean().optional().default(true),
  canExportData: z.boolean().optional().default(false),
  canManageDocuments: z.boolean().optional().default(true),
  canManageSettings: z.boolean().optional().default(false),
  canDeleteConversations: z.boolean().optional().default(false),
});
export type TeamMemberPermissions = z.infer<
  typeof TeamMemberPermissionsSchema
>;

export const TeamMemberSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  role: UserRoleSchema,
  invitedBy: z.string().uuid().nullable(),
  status: TeamMemberStatusSchema,
  permissions: TeamMemberPermissionsSchema,
  invitedAt: z.string().datetime(),
  acceptedAt: z.string().datetime().nullable(),
});
export type TeamMember = z.infer<typeof TeamMemberSchema>;

/** Payload for inviting a new team member. */
export const TeamMemberInviteSchema = z.object({
  email: z.string().email(),
  role: UserRoleSchema.optional().default("agent"),
  permissions: TeamMemberPermissionsSchema.optional().default({}),
});
export type TeamMemberInvite = z.infer<typeof TeamMemberInviteSchema>;

/** Payload for updating an existing team member's role or permissions. */
export const TeamMemberUpdateSchema = z.object({
  role: UserRoleSchema.optional(),
  permissions: TeamMemberPermissionsSchema.optional(),
  status: TeamMemberStatusSchema.optional(),
});
export type TeamMemberUpdate = z.infer<typeof TeamMemberUpdateSchema>;

// ---------------------------------------------------------------------------
// RLS HELPERS (client-side mappings)
// ---------------------------------------------------------------------------

/** Maps to auth.current_tenant_id() SQL function */
export interface TenantContext {
  tenantId: string;
  userId: string;
  role: UserRole;
  isAdmin: boolean;
  isAgent: boolean;
}

// ---------------------------------------------------------------------------
// EMBEDDING OPERATIONS
// ---------------------------------------------------------------------------

export interface EmbeddingConfig {
  model: "text-embedding-3-small" | "text-embedding-3-large" | "text-embedding-ada-002";
  dimensions: 256 | 512 | 1024 | 1536 | 3072;
  chunkSize: number;
  chunkOverlap: number;
}

export const DEFAULT_EMBEDDING_CONFIG: EmbeddingConfig = {
  model: "text-embedding-3-small",
  dimensions: 1536,
  chunkSize: 1000,
  chunkOverlap: 200,
};

/** Strategy for chunking documents before embedding. */
export type ChunkingStrategy =
  | { type: "fixed"; chunkSize: number; overlap: number }
  | { type: "semantic"; maxChunkSize: number }
  | { type: "paragraph" };

// ---------------------------------------------------------------------------
// FEATURE FLAGS (plan-gated)
// ---------------------------------------------------------------------------

export const PLAN_FEATURES = {
  standard: {
    maxChannels: 1,
    maxTeamMembers: 2,
    maxDocuments: 10,
    maxFileSizeMb: 5,
    analyticsRetentionDays: 30,
    allowedFormats: ["text"] as MessageFormat[],
    customBranding: false,
    humanHandoff: true,
    sentimentAnalysis: false,
  },
  intermediate: {
    maxChannels: 3,
    maxTeamMembers: 10,
    maxDocuments: 50,
    maxFileSizeMb: 10,
    analyticsRetentionDays: 90,
    allowedFormats: ["text", "image"] as MessageFormat[],
    customBranding: true,
    humanHandoff: true,
    sentimentAnalysis: false,
  },
  premium: {
    maxChannels: 10,
    maxTeamMembers: 50,
    maxDocuments: 500,
    maxFileSizeMb: 25,
    analyticsRetentionDays: 365,
    allowedFormats: ["text", "image", "audio", "document"] as MessageFormat[],
    customBranding: true,
    humanHandoff: true,
    sentimentAnalysis: true,
  },
} as const;
