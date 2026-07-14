import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/client";
import { getApiTenantId } from "@/lib/api-utils";
import type { Database } from "@/lib/supabase/database.types";

// HumenAI — Conversations API

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient();
    const tenantId = await getApiTenantId(request);
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!tenantId) {
      return NextResponse.json(
        { error: "En-tête x-tenant-id requis" },
        { status: 400 }
      );
    }

    let query = supabase
      .from("conversations")
      .select("*", { count: "exact" })
      .eq("tenant_id", tenantId);

    if (status) {
      query = query.eq("status", status as Database["public"]["Enums"]["conversation_status"]);
    }

    const { data: conversations, error, count } = await query
      .order("last_message_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Erreur lors de la récupération des conversations :", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération des conversations" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      conversations: conversations || [],
      total: count || 0,
    });
  } catch (error) {
    console.error("Erreur serveur conversations GET :", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient();
    const tenantId = await getApiTenantId(request);
    const body = await request.json();
    const { message, customerId, channelType, customerName, customerEmail } = body;

    if (!tenantId) {
      return NextResponse.json(
        { error: "En-tête x-tenant-id requis" },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { error: "Champ obligatoire manquant : message" },
        { status: 400 }
      );
    }

    // Créer la conversation
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .insert({
        tenant_id: tenantId,
        channel_id: null as unknown as string,
        channel_type: (channelType || "web_widget") as Database["public"]["Enums"]["channel_type"],
        customer_id: customerId || `anonymous_${Date.now()}`,
        customer_name: customerName || null,
        customer_email: customerEmail || null,
        status: "active" as Database["public"]["Enums"]["conversation_status"],
        last_message_at: new Date().toISOString(),
        message_count: 1,
      })
      .select()
      .single();

    if (convError) {
      console.error("Erreur lors de la création de la conversation :", convError);
      return NextResponse.json(
        { error: "Erreur lors de la création de la conversation" },
        { status: 500 }
      );
    }

    // Créer le premier message
    const { error: msgError } = await supabase.from("messages").insert({
      tenant_id: tenantId,
      conversation_id: conversation.id,
      sender: "customer",
      content: message,
    });

    if (msgError) {
      console.error("Erreur lors de la création du message :", msgError);
      return NextResponse.json(
        { error: "Erreur lors de l'enregistrement du message" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      conversationId: conversation.id,
      reply: "Message reçu. Traitement en cours...",
    });
  } catch (error) {
    console.error("Erreur serveur conversations POST :", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
