// HumenAI — Model Provider Types
// Defines the multi-model orchestration system for merchant AI providers

export type ModelCapability = "text" | "vision" | "audio";

export type ModelProvider =
  | "openai"
  | "anthropic"
  | "google"
  | "mistral"
  | "deepseek"
  | "openrouter";

export interface ProviderConfig {
  id: string;
  tenantId: string;
  provider: ModelProvider;
  label: string;
  apiKey: string;
  baseUrl?: string;
  models: string[];          // model IDs (e.g. ["gpt-4o", "gpt-4o-mini"])
  capabilities: ModelCapability[];
  defaultModel: string;
  isActive: boolean;
  priority: number;          // fallback order (1 = preferred)
  createdAt: string;
}

export interface ModelInfo {
  provider: ModelProvider;
  modelId: string;
  label: string;
  capabilities: ModelCapability[];
  contextWindow: number;
  isDefault?: boolean;
}

export interface OrchestrationResult {
  reply: string;
  provider: ModelProvider;
  model: string;
  latencyMs: number;
  tokensUsed?: {
    prompt: number;
    completion: number;
  };
}

export interface OrchestrationRequest {
  tenantId: string;
  message: string;
  attachments?: AttachmentInfo[];
  conversationHistory: { role: "user" | "assistant" | "system"; content: string }[];
  systemPrompt: string;
}

export interface AttachmentInfo {
  type: "image" | "audio" | "document";
  url: string;
  mimeType: string;
  /** Optional base64-encoded data (preferred over url) */
  data?: string;
}

// Known models with their capabilities
export const KNOWN_MODELS: Record<ModelProvider, ModelInfo[]> = {
  openai: [
    { provider: "openai", modelId: "gpt-4o", label: "GPT-4o", capabilities: ["text", "vision", "audio"], contextWindow: 128000, isDefault: true },
    { provider: "openai", modelId: "gpt-4o-mini", label: "GPT-4o Mini", capabilities: ["text", "vision"], contextWindow: 128000 },
    { provider: "openai", modelId: "gpt-4o-audio-preview", label: "GPT-4o Audio", capabilities: ["text", "vision", "audio"], contextWindow: 128000 },
    { provider: "openai", modelId: "o3-mini", label: "o3 Mini", capabilities: ["text"], contextWindow: 200000 },
  ],
  anthropic: [
    { provider: "anthropic", modelId: "claude-sonnet-4-20250514", label: "Claude Sonnet 4", capabilities: ["text", "vision"], contextWindow: 200000, isDefault: true },
    { provider: "anthropic", modelId: "claude-haiku-3-5-20241022", label: "Claude Haiku 3.5", capabilities: ["text", "vision"], contextWindow: 200000 },
  ],
  google: [
    { provider: "google", modelId: "gemini-2.5-flash", label: "Gemini 2.5 Flash", capabilities: ["text", "vision", "audio"], contextWindow: 1000000, isDefault: true },
    { provider: "google", modelId: "gemini-2.5-pro", label: "Gemini 2.5 Pro", capabilities: ["text", "vision", "audio"], contextWindow: 1000000 },
  ],
  mistral: [
    { provider: "mistral", modelId: "mistral-large-2501", label: "Mistral Large", capabilities: ["text"], contextWindow: 128000, isDefault: true },
    { provider: "mistral", modelId: "mistral-small-2501", label: "Mistral Small", capabilities: ["text"], contextWindow: 32000 },
  ],
  deepseek: [
    { provider: "deepseek", modelId: "deepseek-chat", label: "DeepSeek V3", capabilities: ["text"], contextWindow: 64000, isDefault: true },
    { provider: "deepseek", modelId: "deepseek-reasoner", label: "DeepSeek R1", capabilities: ["text"], contextWindow: 64000 },
  ],
  openrouter: [
    { provider: "openrouter", modelId: "openrouter/auto", label: "OpenRouter Auto", capabilities: ["text", "vision"], contextWindow: 128000, isDefault: true },
  ],
};

// Default providers by plan
export const PLAN_DEFAULT_PROVIDERS = {
  standard: [{ provider: "openai" as ModelProvider, models: ["gpt-4o-mini"] }],
  intermediate: [
    { provider: "openai" as ModelProvider, models: ["gpt-4o-mini", "gpt-4o"] },
    { provider: "anthropic" as ModelProvider, models: ["claude-haiku-3-5-20241022"] },
  ],
  premium: [
    { provider: "openai" as ModelProvider, models: ["gpt-4o", "gpt-4o-audio-preview"] },
    { provider: "anthropic" as ModelProvider, models: ["claude-sonnet-4-20250514"] },
    { provider: "google" as ModelProvider, models: ["gemini-2.5-flash"] },
  ],
};
