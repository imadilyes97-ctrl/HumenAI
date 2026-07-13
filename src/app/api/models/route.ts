import { NextRequest, NextResponse } from "next/server";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { modelOrchestrator } from "@/lib/models/orchestrator";
import type { ProviderConfig, ModelProvider } from "@/lib/models/types";

// Temporary in-memory store (will be replaced by Supabase)
const modelStore = new Map<string, ProviderConfig[]>();

const PROVIDER_LABELS: Record<ModelProvider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google Gemini",
  mistral: "Mistral",
  deepseek: "DeepSeek",
  openrouter: "OpenRouter",
};

const PROVIDER_CAPABILITIES: Record<ModelProvider, string[]> = {
  openai: ["text", "vision", "audio"],
  anthropic: ["text", "vision"],
  google: ["text", "vision", "audio"],
  mistral: ["text"],
  deepseek: ["text"],
  openrouter: ["text", "vision"],
};

const PROVIDER_DEFAULT_MODELS: Record<ModelProvider, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4o-audio-preview"],
  anthropic: ["claude-sonnet-4-20250514", "claude-haiku-3-5-20241022"],
  google: ["gemini-2.5-flash", "gemini-2.5-pro"],
  mistral: ["mistral-large-2501", "mistral-small-2501"],
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
  openrouter: ["openrouter/auto"],
};

// GET — list configured providers for a tenant
export async function GET(request: NextRequest) {
  const tenantId = request.headers.get("x-tenant-id") || "default";
  const providers = modelStore.get(tenantId) || [];
  return NextResponse.json({ providers });
}

// POST — save or update provider config + test connection
export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get("x-tenant-id") || "default";
    const body = await request.json();
    const { provider: providerName, apiKey, models, defaultModel, isActive, priority } = body;

    if (!providerName || !apiKey) {
      return NextResponse.json({ error: "Provider et API Key requis" }, { status: 400 });
    }

    const p = providerName as ModelProvider;
    const existing = modelStore.get(tenantId) || [];

    // Check if provider already exists → update
    const existingIndex = existing.findIndex((c) => c.provider === p);
    const config: ProviderConfig = {
      id: existing[existingIndex]?.id || `prov_${Date.now()}`,
      tenantId,
      provider: p,
      label: PROVIDER_LABELS[p] || p,
      apiKey,
      models: models || PROVIDER_DEFAULT_MODELS[p] || [PROVIDER_DEFAULT_MODELS[p]?.[0] || "gpt-4o-mini"],
      capabilities: PROVIDER_CAPABILITIES[p] as any || ["text"],
      defaultModel: defaultModel || PROVIDER_DEFAULT_MODELS[p]?.[0] || "gpt-4o-mini",
      isActive: isActive !== undefined ? isActive : true,
      priority: priority || existing.length + 1,
      createdAt: existing[existingIndex]?.createdAt || new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      existing[existingIndex] = config;
    } else {
      existing.push(config);
    }

    modelStore.set(tenantId, existing);

    return NextResponse.json({
      provider: config,
      message: `${config.label} configuré avec succès !`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur inconnue" },
      { status: 500 }
    );
  }
}

// DELETE — remove a provider config
export async function DELETE(request: NextRequest) {
  const tenantId = request.headers.get("x-tenant-id") || "default";
  const id = request.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Provider ID requis" }, { status: 400 });
  }

  const existing = modelStore.get(tenantId) || [];
  modelStore.set(tenantId, existing.filter((c) => c.id !== id));
  return NextResponse.json({ message: "Provider supprimé" });
}

// GET /api/models/available — list available providers/modes
export async function HEAD(request: NextRequest) {
  return NextResponse.json({
    providers: Object.entries(PROVIDER_LABELS).map(([key, label]) => ({
      provider: key,
      label,
      capabilities: PROVIDER_CAPABILITIES[key as ModelProvider],
      models: PROVIDER_DEFAULT_MODELS[key as ModelProvider],
    })),
  });
}
