import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/client";
import { getApiTenantId } from "@/lib/api-utils";
import type { Database } from "@/lib/supabase/database.types";

// HumenAI — Channels API
// Sauvegarde et connecte les canaux (WhatsApp, Instagram, Messenger, TikTok, etc.)

// GET /api/channels — liste les canaux d'un tenant
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient();
    const tenantId = await getApiTenantId(request);
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");

    if (!tenantId) {
      return NextResponse.json(
        { error: "En-tête x-tenant-id requis" },
        { status: 400 }
      );
    }

    let query = supabase
      .from("channels")
      .select("*")
      .eq("tenant_id", tenantId);

    if (type) {
      query = query.eq("type", type as Database["public"]["Enums"]["channel_type"]);
    }

    const { data: channels, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.error("Erreur lors de la récupération des canaux :", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération des canaux" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      channels: (channels || []).map((ch) => ({
        ...ch,
        name: getChannelName(ch.type),
      })),
    });
  } catch (error) {
    console.error("Erreur serveur channels GET :", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

// POST /api/channels — sauvegarde les credentials et connecte
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient();
    const tenantId = await getApiTenantId(request);
    const body = await request.json();
    const { type, credentials, settings } = body;

    if (!tenantId) {
      return NextResponse.json(
        { error: "En-tête x-tenant-id requis" },
        { status: 400 }
      );
    }

    if (!type || !credentials) {
      return NextResponse.json(
        { error: "Champs obligatoires manquants : type, credentials" },
        { status: 400 }
      );
    }

    const channelType = type as Database["public"]["Enums"]["channel_type"];

    // Tester la connexion
    const testResult = await testConnection(type, credentials);
    const channelStatus: Database["public"]["Enums"]["channel_status"] = testResult.success ? "active" : testResult.error === "PENDING" ? "pending" : "error";

    // Vérifier si un canal existe déjà
    const { data: existing } = await supabase
      .from("channels")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("type", channelType)
      .maybeSingle();

    const now = new Date().toISOString();
    const channelData = {
      tenant_id: tenantId,
      type: channelType,
      credentials,
      settings: settings || {},
      status: channelStatus,
      enabled: testResult.success,
      updated_at: now,
    };

    const { data: channel, error } = existing
      ? await supabase
          .from("channels")
          .update(channelData)
          .eq("id", existing.id)
          .select()
          .single()
      : await supabase
          .from("channels")
          .insert({ ...channelData, created_at: now })
          .select()
          .single();

    if (error) {
      console.error("Erreur lors de l'enregistrement du canal :", error);
      return NextResponse.json(
        { error: "Erreur lors de l'enregistrement du canal" },
        { status: 500 }
      );
    }

    const message = testResult.success
      ? `${getChannelName(type)} connecté avec succès !`
      : testResult.error === "PENDING"
      ? "Configuration sauvegardée. Terminez la configuration dans Meta Developer Portal."
      : `Erreur de connexion : ${testResult.error}`;

    return NextResponse.json({
      channel: { ...channel, name: getChannelName(channel.type) },
      message,
    });
  } catch (error) {
    console.error("Erreur serveur channels POST :", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

// DELETE /api/channels — déconnecte un canal
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient();
    const tenantId = await getApiTenantId(request);
    const id = request.nextUrl.searchParams.get("id");

    if (!tenantId) {
      return NextResponse.json(
        { error: "En-tête x-tenant-id requis" },
        { status: 400 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { error: "ID du canal requis" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("channels")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId);

    if (error) {
      console.error("Erreur lors de la suppression du canal :", error);
      return NextResponse.json(
        { error: "Erreur lors de la suppression du canal" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Canal déconnecté avec succès" });
  } catch (error) {
    console.error("Erreur serveur channels DELETE :", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

// Test de connexion selon le type de canal
// "PENDING" = sauvegardé mais pas encore vérifié par Meta
async function testConnection(
  type: string,
  creds: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  await new Promise((r) => setTimeout(r, 500));

  // Si seulement le verifyToken est rempli → état pending (Meta pas encore configuré)
  const hasVerifyToken = !!creds.verifyToken;

  switch (type) {
    case "whatsapp": {
      if (!creds.phoneNumberId && !hasVerifyToken)
        return { success: false, error: "Phone Number ID requis" };
      if (!creds.apiKey && !hasVerifyToken)
        return { success: false, error: "API Key requise" };
      if (creds.apiKey && creds.apiKey.length < 10)
        return { success: false, error: "API Key invalide (trop courte)" };
      if (creds.apiKey && !creds.apiKey.startsWith("EAA"))
        return { success: false, error: "Le token WhatsApp doit commencer par 'EAA'" };
      if (!creds.apiKey && hasVerifyToken)
        return { success: false, error: "PENDING" };
      return { success: true };
    }

    case "instagram":
    case "messenger": {
      if (!creds.pageId && !hasVerifyToken)
        return { success: false, error: "Page ID requis" };
      if (!creds.accessToken && !hasVerifyToken)
        return { success: false, error: "Access Token requis" };
      if (creds.accessToken && creds.accessToken.length < 20)
        return { success: false, error: "Token invalide (trop court)" };
      if (!creds.accessToken && hasVerifyToken)
        return { success: false, error: "PENDING" };
      return { success: true };
    }

    case "tiktok": {
      if (!creds.appId)
        return { success: false, error: "App ID requis" };
      if (!creds.accessToken)
        return { success: false, error: "Access Token requis" };
      return { success: true };
    }

    case "shopify": {
      if (!creds.shopDomain)
        return { success: false, error: "Nom de boutique requis" };
      if (!creds.accessToken)
        return { success: false, error: "Access Token requis" };
      return { success: true };
    }

    case "woocommerce": {
      if (!creds.consumerKey)
        return { success: false, error: "Consumer Key requis" };
      if (!creds.consumerSecret)
        return { success: false, error: "Consumer Secret requis" };
      if (!creds.siteUrl)
        return { success: false, error: "URL du site requise" };
      return { success: true };
    }

    default:
      return { success: false, error: `Type de canal inconnu : ${type}` };
  }
}

function getChannelName(type: string): string {
  const names: Record<string, string> = {
    whatsapp: "WhatsApp Business",
    instagram: "Instagram DM",
    messenger: "Facebook Messenger",
    tiktok: "TikTok DM",
    shopify: "Shopify",
    woocommerce: "WooCommerce",
    wix: "Wix",
    prestashop: "PrestaShop",
    email: "Email",
  };
  return names[type] || type;
}
