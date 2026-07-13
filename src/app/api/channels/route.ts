import { NextRequest, NextResponse } from "next/server";

// HumenAI — Channels API
// Sauvegarde et connecte les canaux (WhatsApp, Instagram, Messenger, TikTok, etc.)

// Stockage temporaire (remplacé par la DB plus tard)
const channelStore = new Map<string, ChannelConfig>();

interface ChannelConfig {
  id: string;
  tenantId: string;
  type: string;
  name: string;
  credentials: Record<string, string>;
  settings: Record<string, string>;
  status: "disconnected" | "connecting" | "connected" | "error";
  error?: string;
  createdAt: string;
}

// GET /api/channels — liste les canaux d'un tenant
export async function GET(request: NextRequest) {
  const tenantId = request.headers.get("x-tenant-id") || "default";
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type");

  const allChannels = Array.from(channelStore.values())
    .filter((c) => c.tenantId === tenantId);

  const channels = type
    ? allChannels.filter((c) => c.type === type)
    : allChannels;

  return NextResponse.json({ channels });
}

// POST /api/channels — sauvegarde les credentials et connecte
export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get("x-tenant-id") || "default";
    const body = await request.json();
    const { type, credentials, settings } = body;

    if (!type || !credentials) {
      return NextResponse.json(
        { error: "Missing required fields: type, credentials" },
        { status: 400 }
      );
    }

    const existing = Array.from(channelStore.values())
      .find((c) => c.tenantId === tenantId && c.type === type);

    const channel: ChannelConfig = {
      id: existing?.id || `ch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tenantId,
      type,
      name: getChannelName(type),
      credentials,
      settings: settings || {},
      status: "connecting",
      createdAt: existing?.createdAt || new Date().toISOString(),
    };

    // Tester la connexion selon le type de canal
    const testResult = await testConnection(type, credentials);
    channel.status = testResult.success ? "connected" : "error";
    channel.error = testResult.error;

    // Sauvegarder
    channelStore.set(channel.id, channel);

    return NextResponse.json({
      channel,
      message: testResult.success
        ? `${getChannelName(type)} connecté avec succès !`
        : `Erreur de connexion : ${testResult.error}`,
    });
  } catch (error) {
    console.error("Channel save error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/channels — déconnecte un canal
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Channel ID required" }, { status: 400 });
  }

  channelStore.delete(id);
  return NextResponse.json({ message: "Channel disconnected" });
}

// Test de connexion simulé (vérifie que les tokens sont présents et ont le bon format)
async function testConnection(
  type: string,
  creds: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  // Simuler un délai réseau
  await new Promise((r) => setTimeout(r, 500));

  switch (type) {
    case "whatsapp": {
      if (!creds.phoneNumberId) return { success: false, error: "Phone Number ID requis" };
      if (!creds.apiKey) return { success: false, error: "API Key requise" };
      if (creds.apiKey.length < 10) return { success: false, error: "API Key invalide (trop courte)" };
      // Vérifier le format du token WhatsApp (commence par EAA)
      if (!creds.apiKey.startsWith("EAA")) {
        return { success: false, error: "Le token WhatsApp doit commencer par 'EAA'" };
      }
      return { success: true };
    }

    case "instagram":
    case "messenger": {
      if (!creds.pageId) return { success: false, error: "Page ID requis" };
      if (!creds.accessToken) return { success: false, error: "Access Token requis" };
      if (creds.accessToken.length < 20) return { success: false, error: "Token invalide (trop court)" };
      return { success: true };
    }

    case "tiktok": {
      if (!creds.appId) return { success: false, error: "App ID requis" };
      if (!creds.accessToken) return { success: false, error: "Access Token requis" };
      return { success: true };
    }

    case "shopify": {
      if (!creds.shopDomain) return { success: false, error: "Nom de boutique requis" };
      if (!creds.accessToken) return { success: false, error: "Access Token requis" };
      return { success: true };
    }

    case "woocommerce": {
      if (!creds.consumerKey) return { success: false, error: "Consumer Key requis" };
      if (!creds.consumerSecret) return { success: false, error: "Consumer Secret requis" };
      if (!creds.siteUrl) return { success: false, error: "URL du site requise" };
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
