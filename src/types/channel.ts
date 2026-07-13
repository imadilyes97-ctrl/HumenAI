// HumenAI — Channel types

export type ChannelType =
  | "whatsapp"
  | "instagram"
  | "messenger"
  | "tiktok"
  | "shopify"
  | "woocommerce"
  | "wix"
  | "prestashop"
  | "magento"
  | "web_widget"
  | "email";

export interface ChannelConfig {
  id: string;
  tenantId: string;
  type: ChannelType;
  enabled: boolean;
  credentials: Record<string, string>; // encrypted
  settings: ChannelSettings;
  status: ChannelStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChannelSettings {
  webhookUrl?: string;
  rateLimitPerMinute: number;
  messageTemplateId?: string; // WhatsApp message templates
  autoReplyOutsideHours: boolean;
  outsideHoursMessage?: string;
}

export type ChannelStatus = "active" | "disconnected" | "rate_limited" | "error" | "pending";

// WhatsApp-specific: 24h window constraint
export interface WhatsAppWindow {
  conversationId: string;
  customerPhone: string;
  lastCustomerMessageAt: Date;
  windowExpiresAt: Date;
  isInWindow: boolean;
}

export interface ChannelQuota {
  channelType: ChannelType;
  dailyUsed: number;
  dailyLimit: number;
  minuteUsed: number;
  minuteLimit: number;
}
