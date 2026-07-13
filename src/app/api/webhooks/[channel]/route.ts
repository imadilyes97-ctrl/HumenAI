// ============================================================================
// HumenAI — Webhook receiver for WhatsApp, Instagram, Messenger
// Handles Meta Cloud API verification (GET) and incoming messages (POST)
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

// ---------------------------------------------------------------------------
// Admin client pour chercher le tenant par verify_token
// ---------------------------------------------------------------------------

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

// ---------------------------------------------------------------------------
// GET — Meta webhook verification (hub.challenge)
// Meta appelle cette URL quand le marchand configure le webhook
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channel: string }> }
) {
  const { channel } = await params;
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  console.log(`[webhooks/${channel}] GET verification: mode=${mode}, token=${token?.slice(0, 8)}...`);

  if (mode === "subscribe" && token) {
    // Chercher un canal avec ce verify_token
    const supabase = getAdmin();
    const { data: channels } = await supabase
      .from("channels")
      .select("tenant_id, id, credentials")
      .eq("type", channel as Database["public"]["Enums"]["channel_type"])
      .filter("credentials->>verifyToken", "eq", token);

    if (channels && channels.length > 0) {
      console.log(`[webhooks/${channel}] Verification OK — tenant ${channels[0].tenant_id}`);
      return new NextResponse(challenge, { status: 200 });
    }

    console.warn(`[webhooks/${channel}] Aucun canal trouvé avec ce verify_token`);
  }

  return new NextResponse("Verification failed", { status: 403 });
}

// ---------------------------------------------------------------------------
// POST — Incoming message from Meta (WhatsApp, Instagram, Messenger)
// Meta appelle cette URL à chaque nouveau message
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channel: string }> }
) {
  const { channel } = await params;

  try {
    const body = await request.json();
    console.log(`[webhooks/${channel}] Message reçu`);

    // Extraire les infos selon le canal
    const result = parseMetaMessage(channel, body);
    if (!result) {
      return NextResponse.json({ status: "ignored" });
    }

    const { tenantId, customerId, customerName, messageText } = result;

    console.log(`[webhooks/${channel}] Traitement: tenant=${tenantId}, from=${customerId}, text="${messageText?.slice(0, 50)}..."`);

    // TODO: Étape 2 — Appeler le pipeline IA pour générer une réponse
    // TODO: Étape 3 — Envoyer la réponse via l'API Meta
    // Pour l'instant on loggue seulement

    return NextResponse.json({ status: "received" });
  } catch (error) {
    console.error(`[webhooks/${channel}] Error:`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Parse Meta message format (WhatsApp Cloud API / Instagram / Messenger)
// ---------------------------------------------------------------------------

interface ParsedMessage {
  tenantId: string;
  customerId: string;
  customerName: string | null;
  messageText: string;
  channelType: string;
}

function parseMetaMessage(channel: string, body: Record<string, unknown>): ParsedMessage | null {
  const object = body.object as string | undefined;
  if (object !== "whatsapp_business_account" && object !== "page") {
    return null;
  }

  const entry = (body.entry as Array<Record<string, unknown>> | undefined)?.[0];
  if (!entry) return null;

  // WhatsApp Cloud API format
  if (object === "whatsapp_business_account") {
    const changes = entry.changes as Array<Record<string, unknown>> | undefined;
    const change = changes?.[0];
    const value = change?.value as Record<string, unknown> | undefined;
    const messages = value?.messages as Array<Record<string, unknown>> | undefined;
    const message = messages?.[0];
    const metadata = value?.metadata as Record<string, unknown> | undefined;
    const contacts = value?.contacts as Array<Record<string, unknown>> | undefined;
    const contact = contacts?.[0];

    if (!message || !metadata) return null;

    const text = message.text as Record<string, string> | undefined;
    const interactive = message.interactive as Record<string, Record<string, string>> | undefined;
    const profile = contact?.profile as Record<string, string> | undefined;

    // Récupérer le message texte ou caption
    const messageText =
      text?.body ||
      (message.caption as string) ||
      (message.type === "interactive" ? interactive?.button_reply?.title || interactive?.list_reply?.title : null) ||
      "";

    return {
      tenantId: metadata.phone_number_id as string,
      customerId: message.from as string,
      customerName: profile?.name || null,
      messageText,
      channelType: "whatsapp",
    };
  }

  // Messenger / Instagram format
  const messaging = (entry.messaging as Array<Record<string, unknown>> | undefined)?.[0];
  const msg = messaging?.message as Record<string, string> | undefined;
  const sender = messaging?.sender as Record<string, string> | undefined;

  if (msg) {
    return {
      tenantId: entry.id as string,
      customerId: sender?.id || "",
      customerName: null,
      messageText: msg.text || "",
      channelType: channel === "instagram" ? "instagram" : "messenger",
    };
  }

  return null;
}
