// ============================================================================
// HumenAI — GET messages + POST agent reply for a single conversation
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/client";
import { getApiTenantId } from "@/lib/api-utils";
import type { Database } from "@/lib/supabase/database.types";

// GET /api/conversations/[id] — Récupère les messages d'une conversation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdminClient();
    const tenantId = await getApiTenantId(request);

    if (!tenantId) {
      return NextResponse.json({ error: "x-tenant-id requis" }, { status: 400 });
    }

    // Récupérer la conversation
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
    }

    // Récupérer les messages
    const { data: messages, error: msgError } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    if (msgError) {
      return NextResponse.json({ error: "Erreur de récupération des messages" }, { status: 500 });
    }

    // Récupérer les infos du canal pour le nom
    const channelName = getChannelName(conversation.channel_type || "");

    return NextResponse.json({
      conversation: {
        ...conversation,
        channelName,
      },
      messages: messages || [],
    });
  } catch (error) {
    console.error("[conversation] GET error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/conversations/[id] — Envoyer une réponse en tant qu'agent humain
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdminClient();
    const tenantId = await getApiTenantId(request);

    if (!tenantId) {
      return NextResponse.json({ error: "x-tenant-id requis" }, { status: 400 });
    }

    const body = await request.json();
    const { message, channelReply } = body;

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: "Message requis" }, { status: 400 });
    }

    // Vérifier que la conversation appartient au tenant
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("id, status, channel_type, customer_id, tenant_id")
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
    }

    // Sauvegarder le message agent dans la DB
    const { error: msgError } = await supabase.from("messages").insert({
      tenant_id: tenantId,
      conversation_id: id,
      sender: "human_agent",
      content: message.trim(),
      created_at: new Date().toISOString(),
    });

    if (msgError) {
      return NextResponse.json({ error: "Erreur d'envoi" }, { status: 500 });
    }

    // Mettre à jour le statut → with_human si c'était waiting_human
    if (conversation.status === "waiting_human") {
      await supabase
        .from("conversations")
        .update({
          status: "with_human" as Database["public"]["Enums"]["conversation_status"],
          last_message_at: new Date().toISOString(),
        })
        .eq("id", id);
    } else {
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", id);
    }

    // Si channelReply est true, essayer d'envoyer via API Meta
    let sentToChannel = false;
    if (channelReply !== false && conversation.channel_type && conversation.customer_id) {
      try {
        const { sendMetaMessage } = await import("@/lib/api/channels/meta-sender");
        const admin = (await import("@/lib/supabase/client")).getSupabaseAdminClient();

        const { data: channel } = await admin
          .from("channels")
          .select("credentials")
          .eq("tenant_id", tenantId)
          .eq("type", conversation.channel_type as Database["public"]["Enums"]["channel_type"])
          .maybeSingle();

        if (channel?.credentials) {
          const result = await sendMetaMessage({
            channelType: conversation.channel_type as "whatsapp" | "messenger" | "instagram",
            credentials: channel.credentials as Record<string, string>,
            recipientId: conversation.customer_id,
            text: message.trim(),
          });
          sentToChannel = result.success;
        }
      } catch {
        // Si l'envoi échoue, le message est au moins en DB
      }
    }

    return NextResponse.json({
      message: "Message envoyé",
      sentToChannel,
    });
  } catch (error) {
    console.error("[conversation] POST error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PATCH /api/conversations/[id] — Changer le statut (prendre/fermer)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdminClient();
    const tenantId = await getApiTenantId(request);

    if (!tenantId) {
      return NextResponse.json({ error: "x-tenant-id requis" }, { status: 400 });
    }

    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: "Statut requis" }, { status: 400 });
    }

    const { error } = await supabase
      .from("conversations")
      .update({
        status: status as Database["public"]["Enums"]["conversation_status"],
        last_message_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("tenant_id", tenantId);

    if (error) {
      return NextResponse.json({ error: "Erreur de mise à jour" }, { status: 500 });
    }

    return NextResponse.json({ message: "Statut mis à jour" });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
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
    web_widget: "Widget Web",
    email: "Email",
  };
  return names[type] || type;
}
