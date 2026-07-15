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
    const needsMultimodal = requiredCaps.some(cap => cap !== "text");

    // ═══════════════════════════════════════════════════════════════
    // PHASE 1: SÉLECTION DU PROVIDER
    // ═══════════════════════════════════════════════════════════════

    // Try tenant providers first
    let provider = this.pickProvider(providerConfigs, requiredCaps);
    console.log(`[orchestrator] Phase 1 — Provider sélectionné: ${provider?.provider || "aucun"} | Caps requises: ${requiredCaps.join(",")}`);

    // Si le provider tenant ne supporte pas les capacités requises → fallback Gemini intégré
    if (provider) {
      const providerSupportsAll = requiredCaps.every(cap => provider!.capabilities.includes(cap));

      if (needsMultimodal && !providerSupportsAll) {
        const missingCaps = requiredCaps.filter(cap => !provider!.capabilities.includes(cap));
        console.log(`[orchestrator] Phase 1 — ${provider.provider} ne supporte pas ${missingCaps.join(", ")} → Fallback Gemini intégré`);

        const builtin = this.createBuiltinFallbackProvider();
        if (builtin) {
          provider = builtin;
          console.log(`[orchestrator] Phase 1 — ✅ Fallback Gemini intégré activé`);
        }
      }
    }

    // Dernier recours: même sans tenant providers, essayer Gemini intégré
    if (!provider && needsMultimodal) {
      const builtin = this.createBuiltinFallbackProvider();
      if (builtin) {
        provider = builtin;
        console.log(`[orchestrator] Phase 1 — Fallback Gemini intégré (aucun provider tenant)`);
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

    // ═══════════════════════════════════════════════════════════════
    // PHASE 2: APPEL AU PROVIDER
    // ═══════════════════════════════════════════════════════════════

    const startTime = Date.now();

    // On essaie le provider principal
    const mainResult = await this.tryProviderWithRetry(provider, request, requiredCaps, startTime);
    if (mainResult) return mainResult;

    // Si le provider était un fallback Gemini (vision/audio) et qu'il a échoué,
    // on cherche un AUTRE provider qui supporte les capacités requises
    const isBuiltinFallback = provider.id === "builtin-gemini";
    if (isBuiltinFallback && needsMultimodal) {
      // Chercher un provider tenant qui supporte la vision/audio
      const multimodalProvider = providerConfigs
        .filter(c => c.isActive && c.id !== provider.id)
        .filter(c => requiredCaps.every(cap => c.capabilities.includes(cap)))
        .sort((a, b) => a.priority - b.priority)[0];

      if (multimodalProvider) {
        console.log(`[orchestrator] Phase 2 — Fallback vers provider tenant multimodal: ${multimodalProvider.provider}`);
        const tenantResult = await this.tryProviderWithRetry(multimodalProvider, request, requiredCaps, startTime);
        if (tenantResult) return tenantResult;
      }

      // Pas de vision disponible → message d'erreur clair plutôt qu'une réponse aveugle
      console.error(`[orchestrator] ❌❌ AUCUN provider vision disponible — image non analysée`);
      return {
        reply: "Merci pour votre photo ! Je n'arrive pas à l'analyser actuellement. Pouvez-vous me décrire ce que vous cherchez ?",
        provider: provider.provider,
        model: provider.defaultModel,
        latencyMs: Date.now() - startTime,
      };
    }

    // Fallback standard (sans image) : essayer les autres providers tenants
    console.log(`[orchestrator] Phase 2 — Fallback standard: essai des autres providers...`);
    const fallbackConfigs = providerConfigs
      .filter((c) => c.id !== provider.id && c.isActive)
      .sort((a, b) => a.priority - b.priority);

    for (const fallback of fallbackConfigs) {
      const result = await this.tryProvider(fallback, request, startTime);
      if (result) return result;
    }

    // Tous les providers ont échoué
    return {
      reply: "Désolé, tous les modèles IA sont actuellement indisponibles. Veuillez réessayer plus tard.",
      provider: provider.provider,
      model: provider.defaultModel,
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * Appelle un provider avec retry sur un modèle alternatif (Gemini uniquement)
   */
  private async tryProviderWithRetry(
    config: ProviderConfig,
    request: OrchestrationRequest,
    requiredCaps: ModelCapability[],
    startTime: number
  ): Promise<OrchestrationResult | null> {
    // Premier essai avec le modèle par défaut
    const firstTry = await this.tryProvider(config, request, startTime);
    if (firstTry) return firstTry;

    // Si c'est Gemini et que le premier essai a échoué, retenter avec un modèle plus tolérant
    if (config.provider === "google") {
      const fallbackModels = config.models.filter(m => m !== config.defaultModel);
      for (const altModel of fallbackModels) {
        console.log(`[orchestrator] ⚠️ Retry Gemini avec modèle: ${altModel}`);
        const retryConfig = { ...config, defaultModel: altModel };
        const retryResult = await this.tryProvider(retryConfig, request, startTime);
        if (retryResult) return retryResult;
      }
    }

    return null;
  }

  /**
   * Appelle un fournisseur et retourne null en cas d'erreur (avec log)
   */
  private async tryProvider(
    config: ProviderConfig,
    request: OrchestrationRequest,
    startTime: number
  ): Promise<OrchestrationResult | null> {
    try {
      const result = await this.callProvider(config, request);
      return { ...result, latencyMs: Date.now() - startTime };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`[orchestrator] ❌ ${config.provider}/${config.defaultModel} a échoué: ${errMsg.slice(0, 200)}`);
      return null;
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
