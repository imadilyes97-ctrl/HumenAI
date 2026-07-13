import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import type { ModelProvider } from "@/lib/models/types";

// HumenAI — Models API
// Configuration des fournisseurs de modèles IA par tenant

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

// GET — liste les providers configurés pour un tenant
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient(request);
    const tenantId = request.headers.get("x-tenant-id");

    if (!tenantId) {
      return NextResponse.json(
        { error: "En-tête x-tenant-id requis" },
        { status: 400 }
      );
    }

    const { data: providers, error } = await supabase
      .from("model_providers")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("priority", { ascending: true });

    if (error) {
      console.error("Erreur lors de la récupération des providers :", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération des providers" },
        { status: 500 }
      );
    }

    return NextResponse.json({ providers: providers || [] });
  } catch (error) {
    console.error("Erreur serveur models GET :", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

// POST — sauvegarde ou met à jour la configuration d'un provider
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient(request);
    const tenantId = request.headers.get("x-tenant-id");
    const body = await request.json();
    const { provider: providerName, apiKey, models, defaultModel, isActive, priority } = body;

    if (!tenantId) {
      return NextResponse.json(
        { error: "En-tête x-tenant-id requis" },
        { status: 400 }
      );
    }

    if (!providerName || !apiKey) {
      return NextResponse.json(
        { error: "Provider et API Key requis" },
        { status: 400 }
      );
    }

    const p = providerName as ModelProvider;
    const now = new Date().toISOString();

    // Vérifier si une config existe déjà pour ce tenant + provider
    const { data: existing } = await supabase
      .from("model_providers")
      .select("id, created_at")
      .eq("tenant_id", tenantId)
      .eq("provider", p)
      .maybeSingle();

    const record = {
      tenant_id: tenantId,
      provider: p,
      label: PROVIDER_LABELS[p] || p,
      api_key: apiKey,
      models: models || PROVIDER_DEFAULT_MODELS[p] || ["gpt-4o-mini"],
      capabilities: PROVIDER_CAPABILITIES[p] || ["text"],
      default_model: defaultModel || PROVIDER_DEFAULT_MODELS[p]?.[0] || "gpt-4o-mini",
      is_active: isActive !== undefined ? isActive : true,
      priority: priority || 1,
      updated_at: now,
    };

    const { data: provider, error } = existing
      ? await supabase
          .from("model_providers")
          .update(record)
          .eq("id", existing.id)
          .select()
          .single()
      : await supabase
          .from("model_providers")
          .insert({ ...record, created_at: now })
          .select()
          .single();

    if (error) {
      console.error("Erreur lors de l'enregistrement du provider :", error);
      return NextResponse.json(
        { error: "Erreur lors de l'enregistrement du provider" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      provider,
      message: `${record.label} configuré avec succès !`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur inconnue" },
      { status: 500 }
    );
  }
}

// DELETE — supprime la configuration d'un provider
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient(request);
    const tenantId = request.headers.get("x-tenant-id");
    const id = request.nextUrl.searchParams.get("id");

    if (!tenantId) {
      return NextResponse.json(
        { error: "En-tête x-tenant-id requis" },
        { status: 400 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { error: "ID du provider requis" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("model_providers")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId);

    if (error) {
      console.error("Erreur lors de la suppression du provider :", error);
      return NextResponse.json(
        { error: "Erreur lors de la suppression du provider" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Provider supprimé avec succès" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur inconnue" },
      { status: 500 }
    );
  }
}

// GET /api/models/available — liste les providers/modèles disponibles
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
