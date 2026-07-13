// HumenAI — AI Configuration & Provider Management

export type AIProvider = "openai" | "anthropic" | "openrouter";

export interface AIModelConfig {
  provider: AIProvider;
  model: string;
  maxTokens: number;
  temperature: number;
}

export const DEFAULT_MODELS: Record<string, AIModelConfig> = {
  fast: {
    provider: "openai",
    model: "gpt-4o-mini",
    maxTokens: 1024,
    temperature: 0.3,
  },
  default: {
    provider: "openai",
    model: "gpt-4o",
    maxTokens: 2048,
    temperature: 0.5,
  },
  reasoning: {
    provider: "anthropic",
    model: "claude-3-haiku-20240307",
    maxTokens: 4096,
    temperature: 0.2,
  },
};

export class AIProviderManager {
  private apiKeys: Map<AIProvider, string> = new Map();

  constructor() {
    // Load from environment
    if (process.env.OPENAI_API_KEY) this.apiKeys.set("openai", process.env.OPENAI_API_KEY);
    if (process.env.ANTHROPIC_API_KEY) this.apiKeys.set("anthropic", process.env.ANTHROPIC_API_KEY);
    if (process.env.OPENROUTER_API_KEY) this.apiKeys.set("openrouter", process.env.OPENROUTER_API_KEY);
  }

  getConfig(type: "fast" | "default" | "reasoning"): AIModelConfig | null {
    const config = DEFAULT_MODELS[type];
    if (!config) return null;

    const key = this.apiKeys.get(config.provider);
    if (!key) return null;

    return config;
  }

  hasAvailableProvider(): boolean {
    return this.apiKeys.size > 0;
  }

  async generateResponse(
    config: AIModelConfig,
    messages: { role: string; content: string }[]
  ): Promise<string> {
    switch (config.provider) {
      case "openai":
        return this.callOpenAI(config, messages);
      case "anthropic":
        return this.callAnthropic(config, messages);
      default:
        throw new Error(`Provider ${config.provider} not implemented`);
    }
  }

  private async callOpenAI(
    config: AIModelConfig,
    messages: { role: string; content: string }[]
  ): Promise<string> {
    const key = this.apiKeys.get("openai")!;
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API error: ${err}`);
    }

    const data = await res.json();
    return data.choices[0].message.content;
  }

  private async callAnthropic(
    config: AIModelConfig,
    messages: { role: string; content: string }[]
  ): Promise<string> {
    const key = this.apiKeys.get("anthropic")!;
    const systemMsg = messages.find((m) => m.role === "system");
    const chatMessages = messages.filter((m) => m.role !== "system");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        system: systemMsg?.content,
        messages: chatMessages.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
        max_tokens: config.maxTokens,
        temperature: config.temperature,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic API error: ${err}`);
    }

    const data = await res.json();
    return data.content[0].text;
  }
}

export const aiProvider = new AIProviderManager();
