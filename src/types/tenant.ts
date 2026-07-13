// HumenAI — Multi-tenant types

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: TenantPlan;
  settings: TenantSettings;
  createdAt: Date;
  updatedAt: Date;
}

export type TenantPlan = "standard" | "intermediate" | "premium";

export interface TenantSettings {
  // Brand identity
  chatbotName: string;
  brandTone: BrandTone;
  companyMission: string;
  languageRules: string;
  primaryLanguage: string;
  supportedLanguages: string[];
  fallbackLanguage: string;
  allowEmojis: boolean;
  preferredResponseLength: "short" | "medium" | "long";

  // Business hours
  businessHours: BusinessHours;
  humanHandoffAvailable: boolean;

  // Features by plan
  allowedFormats: MessageFormat[];
  maxConversationsPerDay: number;
  analyticsRetentionDays: number;
}

export type BrandTone = "professional" | "friendly" | "humorous" | "direct";

export type MessageFormat = "text" | "image" | "audio";

export interface BusinessHours {
  enabled: boolean;
  timezone: string;
  hours: Record<number, { open: string; close: string } | null>; // day of week (0-6)
}

export const PLAN_FEATURES: Record<TenantPlan, { formats: MessageFormat[] }> = {
  standard: { formats: ["text"] },
  intermediate: { formats: ["text", "image"] },
  premium: { formats: ["text", "image", "audio"] },
};
