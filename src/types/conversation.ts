// HumenAI — Conversation types

export type ConversationStatus = "active" | "waiting_human" | "with_human" | "closed";

export type MessageSender = "customer" | "bot" | "human_agent";

export type MessageFormat = "text" | "image" | "audio" | "document";

export interface Conversation {
  id: string;
  tenantId: string;
  channelId: string;
  channelType: string;
  customerId: string;
  status: ConversationStatus;
  assignedAgentId?: string;
  metadata: ConversationMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationMetadata {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  language: string;
  sentiment: SentimentScore;
  orderId?: string;
  referrer?: string;
}

export interface SentimentScore {
  overall: number; // -1 to 1
  frustration: number; // 0 to 1
  urgency: number; // 0 to 1
  lastUpdated: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  sender: MessageSender;
  format: MessageFormat;
  content: string;
  metadata?: Record<string, string>;
  createdAt: Date;
}

export interface AgentAssignment {
  conversationId: string;
  agentId: string;
  agentName: string;
  assignedAt: Date;
  assignmentType: "round_robin" | "manual" | "least_busy";
}
