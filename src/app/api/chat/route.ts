import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { modelOrchestrator } from "@/lib/models/orchestrator";
import type { ProviderConfig, ModelProvider, ModelCapability } from "@/lib/models/types";
import { buildUnifiedSystemPrompt } from "@/lib/ai/language";
import { parseBehaviorConfig, buildBehaviorSystemPrompt } from "@/lib/ai/behavior";
import { searchDocuments } from "@/lib/rag/embedding";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, message, conversationId, attachments } = body;

    const supabase = getSupabaseServerClient(request);

    // 1. Load tenant settings
    const { data: settings } = await supabase
      .from("tenant_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .single();

    // 2. Load active providers
    const { data: providers } = await supabase
      .from("model_providers")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("priority");

    // 3. Build system prompt — commercial agent + multilingue + darija
    const rawSettings = settings as Record<string, unknown> | null;
    const chatbotName = String(rawSettings?.chatbot_name || "Assistant");
    const brandTone = String(rawSettings?.brand_tone || "friendly");
    const companyMission = String(rawSettings?.company_mission || "");
    const languageRules = String(rawSettings?.language_rules || "");
    const prefLength = String(rawSettings?.preferred_response_length || "medium");
    const allowEmojis = rawSettings?.allow_emojis !== false;
    const greeting = String(rawSettings?.greeting_message || "");
    const fallbackMsg = String(rawSettings?.fallback_message || "");

    let systemPrompt = buildUnifiedSystemPrompt({
      chatbotName,
      brandTone,
      companyMission,
      languageRules,
      prefLength,
      allowEmojis,
      greeting,
      fallbackMsg,
    });

    // 4. Inject behavior config (prank mode, checkout mode, personnalité fine)
    const behaviorConfig = parseBehaviorConfig(rawSettings?.language_rules as string | null);
    systemPrompt += "\n" + buildBehaviorSystemPrompt(behaviorConfig, brandTone);

    // 5. Inject RAG context (documents de connaissance)
    try {
      const similarityThreshold = (rawSettings?.similarity_threshold as number) || 0.65;
      const maxChunks = (rawSettings?.max_chunks as number) || 5;
      const docs = await searchDocuments(tenantId, message, {
        limit: maxChunks,
        minSimilarity: similarityThreshold,
      });
      if (docs.length > 0) {
        systemPrompt += "\n\n## BASE DE CONNAISSANCES (produits / catalogue)\n" +
          docs.map(d => `📦 ${d.chunk.content}`).join("\n---\n");
      }
    } catch {
      // RAG not available, continue without
    }

    // 6. No providers configured => fallback
    if (!providers || providers.length === 0) {
      return NextResponse.json({
        reply: "Aucun modèle IA connecté. Veuillez configurer une clé API dans les paramètres.",
        conversationId,
      });
    }

    // 7. Format providers for orchestrator
    const providerConfigs = providers.map(p => ({
      id: p.id,
      tenantId: p.tenant_id,
      provider: p.provider as ModelProvider,
      label: p.label,
      apiKey: p.api_key,
      models: p.models,
      capabilities: p.capabilities as ModelCapability[],
      defaultModel: p.default_model,
      isActive: p.is_active,
      priority: p.priority,
      createdAt: p.created_at,
    } satisfies Partial<ProviderConfig>));

    // 8. Call orchestrator
    const result = await modelOrchestrator.orchestrate(
      {
        tenantId,
        message,
        conversationHistory: [],
        systemPrompt,
        attachments: attachments?.length ? attachments.map((a: { type: string; url: string; mimeType: string }) => ({
          type: a.type as "image" | "audio" | "document",
          url: a.url,
          mimeType: a.mimeType || "image/jpeg",
        })) : undefined,
      },
      providerConfigs
    );

    // 9. Save conversation + message
    const convId = conversationId || `conv_${Date.now()}`;
    await supabase.from("messages").insert({
      conversation_id: convId,
      tenant_id: tenantId,
      sender: "bot",
      format: "text",
      content: result.reply,
      tokens_prompt: result.tokensUsed?.prompt,
      tokens_completion: result.tokensUsed?.completion,
      latency_ms: result.latencyMs,
    });

    return NextResponse.json({
      reply: result.reply,
      conversationId: convId,
      provider: result.provider,
      model: result.model,
    });

  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({
      reply: "Désolé, une erreur technique est survenue. Veuillez réessayer.",
    });
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok", service: "HumenAI Chat", version: "0.2.0" });
}
