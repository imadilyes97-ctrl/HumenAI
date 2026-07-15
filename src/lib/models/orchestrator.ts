// HumenAI — Model Orchestrator
// Routes incoming messages to the best AI provider based on content type

import type { ProviderConfig, OrchestrationRequest, OrchestrationResult, ModelCapability, ModelProvider } from "./types";
import { callOpenAI } from "./providers/openai";
import { callAnthropic } from "./providers/anthropic";
import { callGoogle } from "./providers/google";
import { callMistral } from "./providers/mistral";
import { callDeepSeek } from "./providers/deepseek";
import { callOpenRouter } from "./providers/openrouter";

export class ModelOrchestrator {
  /**
   * Determine required capabilities based on message + attachments
   */
  private getRequiredCapabilities(request: OrchestrationRequest): ModelCapability[] {
    const caps: ModelCapability[] = ["text"];

    if (request.attachments) {
      for (const att of request.attachments) {
        if (att.type === "image") caps.push("vision");
        if (att.type === "audio") caps.push("audio");
      }
    }

    return [...new Set(caps)]; // deduplicate
  }

  /**
   * Pick the best provider config for the required capabilities
   * Uses priority order and falls back if no match
   */
  private pickProvider(
    configs: ProviderConfig[],
    requiredCaps: ModelCapability[]
  ): ProviderConfig | null {
    // Sort by priority (lower = better) then filter by capabilities
    const sorted = [...configs]
      .filter((c) => c.isActive)
      .sort((a, b) => a.priority - b.priority);

    // Try exact match first (all capabilities covered)
    const exact = sorted.find((c) =>
      requiredCaps.every((cap) => c.capabilities.includes(cap))
    );
    if (exact) return exact;

    // Fallback to text-only provider if possible
    if (requiredCaps.every((c) => c === "text")) {
      return sorted[0] || null;
    }

    // If attachments are present but no provider supports them, best effort
    return sorted[0] || null;
  }

  /**
   * Create a built-in Gemini vision/audio fallback when no tenant provider supports them
   */
  private createBuiltinFallbackProvider(): ProviderConfig | null {
    const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
    if (!geminiKey) return null;

    return {
      id: "builtin-gemini",
      tenantId: "system",
      provider: "google" as ModelProvider,
      label: "Gemini Flash (Fallback intégré)",
      apiKey: geminiKey,
      models: ["gemini-2.5-flash", "gemini-1.5-flash"],
      capabilities: ["text", "vision", "audio"] as ModelCapability[],
      defaultModel: "gemini-2.5-flash",
      isActive: true,
      priority: 999, // Lowest priority — only used when nothing else works
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Main orchestration: analyze request → pick provider → call API → return
   */
  async orchestrate(
    request: OrchestrationRequest,
    providerConfigs: ProviderConfig[]
  ): Promise<OrchestrationResult> {
    const requiredCaps = this.getRequiredCapabilities(request);

    // Try tenant providers first
    let provider = this.pickProvider(providerConfigs, requiredCaps);

    // Vision/audio fallback: si le provider tenant ne supporte pas les capacités requises
    if (provider) {
      const needsMultimodal = requiredCaps.some(cap => cap !== "text");
      const providerSupportsAll = requiredCaps.every(cap => provider!.capabilities.includes(cap));

      if (needsMultimodal && !providerSupportsAll) {
        const missingCaps = requiredCaps.filter(cap => !provider!.capabilities.includes(cap));
        console.log(`[orchestrator] Fallback multimodal: ${provider.provider} ne supporte pas ${missingCaps.join(", ")}`);

        const builtin = this.createBuiltinFallbackProvider();
        if (builtin) {
          console.log(`[orchestrator] Fallback → Gemini intégré (${missingCaps.join(", ")})`);
          provider = builtin;
        }
      }
    }

    if (!provider) {
      // Dernier recours: même sans tenant providers, essayer Gemini intégré
      const needsMultimodal = requiredCaps.some(cap => cap !== "text");
      if (needsMultimodal) {
        const builtin = this.createBuiltinFallbackProvider();
        if (builtin) {
          console.log(`[orchestrator] Fallback: Gemini intégré (aucun provider tenant)`);
          provider = builtin;
        }
      }
    }

    if (!provider) {
      return {
        reply: "Aucun modèle IA configuré. Veuillez ajouter une clé API dans les paramètres.",
        provider: "openai" as ModelProvider,
        model: "none",
        latencyMs: 0,
      };
    }

    const startTime = Date.now();

    try {
      const result = await this.callProvider(provider, request);
      return {
        ...result,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      // Try fallback to next available tenant provider
      const fallbackConfigs = providerConfigs
        .filter((c) => c.id !== provider.id && c.isActive)
        .sort((a, b) => a.priority - b.priority);

      for (const fallback of fallbackConfigs) {
        try {
          const result = await this.callProvider(fallback, request);
          return {
            ...result,
            latencyMs: Date.now() - startTime,
          };
        } catch {
          continue; // try next fallback
        }
      }

      // All providers failed
      return {
        reply: "Désolé, tous les modèles IA sont actuellement indisponibles. Veuillez réessayer plus tard.",
        provider: provider.provider,
        model: provider.defaultModel,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  private async callProvider(
    config: ProviderConfig,
    request: OrchestrationRequest
  ): Promise<{ reply: string; provider: ModelProvider; model: string; tokensUsed?: { prompt: number; completion: number } }> {
    const model = config.defaultModel;

    switch (config.provider) {
      case "openai":
        return callOpenAI(config.apiKey, model, request);
      case "anthropic":
        return callAnthropic(config.apiKey, model, request);
      case "google":
        return callGoogle(config.apiKey, model, request);
      case "mistral":
        return callMistral(config.apiKey, model, request);
      case "deepseek":
        return callDeepSeek(config.apiKey, model, request);
      case "openrouter":
        return callOpenRouter(config.apiKey, model, request);
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  }
}

export const modelOrchestrator = new ModelOrchestrator();
