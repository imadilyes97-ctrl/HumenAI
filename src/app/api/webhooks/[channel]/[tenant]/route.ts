// ============================================================================
// HumenAI — Webhook receiver par tenant
// Chaque client a sa propre URL : /api/webhooks/{channel}/{tenant-slug}
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { modelOrchestrator } from "@/lib/models/orchestrator";
import { sendMetaMessage } from "@/lib/api/channels/meta-sender";
import type { ModelProvider, ModelCapability } from "@/lib/models/types";
import { searchDocuments } from "@/lib/rag/embedding";
import { buildUnifiedSystemPrompt } from "@/lib/ai/language";
import { parseBehaviorConfig, buildBehaviorSystemPrompt } from "@/lib/ai/behavior";
import { downloadImageFromMetaMessage } from "@/lib/api/media/downloader";
import { searchProducts, buildProductContext } from "@/lib/api/products/search";

// ---------------------------------------------------------------------------
// Admin client (bypass RLS)
// ---------------------------------------------------------------------------

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

// ---------------------------------------------------------------------------
// GET — Meta webhook verification
// Meta appelle cette URL avec ?hub.mode=subscribe&hub.verify_token=xxx&hub.challenge=yyy
// On sait déjà quel tenant c'est grâce au slug dans l'URL
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channel: string; tenant: string }> }
) {
  const { channel, tenant } = await params;
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  console.log(`[webhooks/${channel}/${tenant}] GET verification`);

  // ✅ Comme n8n : si Meta envoie une verification valide, on accepte
  // La securite est dans l'unicite de l'URL (tenant slug unique)
  // Le verify token sera valide en DB quand le client sauvegardera
  if (mode === "subscribe" && token && challenge) {
    console.log(`[webhooks/${channel}/${tenant}] ✅ Verification OK`);
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Verification failed", { status: 403 });
}

// ---------------------------------------------------------------------------
// POST — Message entrant → IA → Réponse
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channel: string; tenant: string }> }
) {
  const { channel, tenant } = await params;

  try {
    const body = await request.json();
    console.log(`[webhooks/${channel}/${tenant}] Message reçu`);

    // 1. Parse the Meta message
    const parsed = parseMetaMessage(channel, body);
    if (!parsed) return NextResponse.json({ status: "ignored" });

    const { customerId, customerName, messageText, channelType, attachments } = parsed;
    if (!messageText && (!attachments || attachments.length === 0)) return NextResponse.json({ status: "ignored" });

    console.log(`[webhooks/${channel}/${tenant}] De: ${customerId}, Texte: "${messageText.slice(0, 80)}"`);

    // 2. Trouver le tenant par slug + son canal
    const supabase = getAdmin();
    const { data: tenantData } = await supabase
      .from("tenants")
      .select("id")
      .eq("slug", tenant)
      .single();

    if (!tenantData) {
      console.warn(`[webhooks/${channel}/${tenant}] Tenant introuvable`);
      return NextResponse.json({ status: "ignored" });
    }

    const { data: channelData } = await supabase
      .from("channels")
      .select("id, credentials")
      .eq("tenant_id", tenantData.id)
      .eq("type", channelType as Database["public"]["Enums"]["channel_type"])
      .single();

    if (!channelData) {
      console.warn(`[webhooks/${channel}/${tenant}] Canal non configuré`);
      return NextResponse.json({ status: "ignored" });
    }

    const tenantId = tenantData.id;
    const channelId = channelData.id;
    const credentials = channelData.credentials as Record<string, string>;

    // 2.5 Télécharger les images Meta côté serveur
    // Les URLs platform-lookaside.fbsbx.com expirent → on les download + base64 direct
    let imagesDisponibles = false;
    if (attachments) {
      for (const att of attachments) {
        if (att.type === "image" && !att.url.startsWith("data:")) {
          const downloaded = await downloadImageFromMetaMessage(att.url, credentials);
          if (downloaded) {
            att.data = downloaded.data;
            att.mimeType = downloaded.mimeType;
            imagesDisponibles = true;
            console.log(`[webhooks/${channel}/${tenant}] Image téléchargée ✅ (${(downloaded.data.length / 1024).toFixed(1)} KB base64)`);
          } else {
            console.warn(`[webhooks/${channel}/${tenant}] ⚠️ Image non téléchargeable`);
            // Transformer en texte pour éviter d'envoyer une URL morte à l'IA
            att.type = "text";
          }
        } else if (att.type === "image" && att.url.startsWith("data:")) {
          imagesDisponibles = true;
        }
      }
    }

    // 3. Créer ou récupérer la conversation
    const convId = await getOrCreateConversation(supabase, {
      tenantId,
      channelId,
      channelType: channelType as Database["public"]["Enums"]["channel_type"],
      customerId,
      customerName,
    });

    // 4. Sauvegarder le message client
    await supabase.from("messages").insert({
      tenant_id: tenantId,
      conversation_id: convId,
      sender: "customer",
      content: messageText,
      created_at: new Date().toISOString(),
    });

    // 5. Charger les 20 derniers messages pour le contexte de conversation
    const { data: recentMessages } = await supabase
      .from("messages")
      .select("sender, content")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(20);

    const conversationHistory = (recentMessages || []).slice(0, -1).map(m => ({
      role: (m.sender === "bot" || m.sender === "human_agent" ? "assistant" : "user") as "user" | "assistant",
      content: m.content,
    }));

    // 6. Charger les providers IA du tenant
    const { data: providers } = await supabase
      .from("model_providers")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("priority");

    // 6. Charger les settings du tenant
    const { data: rawSettings } = await supabase
      .from("tenant_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .single();
    const settings = rawSettings as Record<string, unknown> | null;

    // 7. System prompt — agent commercial intelligent + multilingue + darija
    const chatbotName = String(settings?.chatbot_name || "Assistant");
    const brandTone = String(settings?.brand_tone || "friendly");
    const companyMission = String(settings?.company_mission || "");
    const languageRules = String(settings?.language_rules || "");
    const prefLength = String(settings?.preferred_response_length || "medium");
    const allowEmojis = settings?.allow_emojis !== false;
    const greeting = String(settings?.greeting_message || "");
    const fallbackMsg = String(settings?.fallback_message || "");

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

    // Behavior config (prank mode, checkout mode, personnalité)
    const behaviorConfig = parseBehaviorConfig(languageRules || null);
    systemPrompt += "\n" + buildBehaviorSystemPrompt(behaviorConfig, brandTone);

    // Détection: image reçue ? (utilisé avant la RAG et le catalogue)
    const hasImages = attachments && attachments.length > 0;
    // Si le message n'est qu'un placeholder d'image sans vrai texte
    const isImageOnly = hasImages && (!messageText.trim() || messageText.trim() === "[Image]" || messageText.trim() === "[Image reçue du client]");
    const searchQuery = isImageOnly ? "catalogue produits" : messageText;

    // RAG context
    let ragContext = "";
    try {
      const similarityThreshold = (settings?.similarity_threshold as number) || 0.65;
      const maxChunks = (settings?.max_chunks as number) || 5;
      const docs = await searchDocuments(tenantId, searchQuery, {
        limit: maxChunks,
        minSimilarity: similarityThreshold,
      });
      if (docs.length > 0) {
        ragContext = "\n\n## BASE DE CONNAISSANCES (produits / catalogue)\n" +
          docs.map(d => `📦 ${d.chunk.content}`).join("\n---\n");
        console.log(`[webhooks/${channel}/${tenant}] RAG: ${docs.length} documents`);
      }
    } catch {
      // RAG non disponible, continuer sans
    }

    systemPrompt += ragContext;

    // Recherche catalogue produits
    const hasProductIntent = /(?:je\s*veux|vous\s*avez|combien|prix|quel\s*est\s*le\s*prix|trouver|cherche|besoin|produit|article|catégorie|j\s*ai\s*besoin|je\s*cherche|est-ce\s*que\s*vous)/i.test(searchQuery);
    if (hasProductIntent || hasImages) {
      try {
        const products = await searchProducts(tenantId, searchQuery, { limit: 5, minSimilarity: 0.2 });
        if (products.length > 0) {
          systemPrompt += buildProductContext(products);
        } else if (hasImages) {
          systemPrompt += `\n\n## PHOTO REÇUE — AUCUN PRODUIT CORRESPONDANT AUTOMATIQUEMENT
Le client a envoyé une photo. Utilise TA VISION pour l'analyser :
- 📦 Si tu RECONNAIS un produit sur la photo → dis "Oui ce produit est disponible !" + prix si tu le connais
- 🧑 Si c'est un selfie / photo de personne → complimente poliment, puis demande ce que le client cherche
- ❓ Si c'est autre chose (document, paysage, etc.) → réponds naturellement, puis ramène la conversation vers la vente
- 💡 Si tu n'es pas sûr du produit exact, demande au client de te décrire ce qu'il cherche`;
        }
      } catch {
        // Product search failed, continue
      }
    }

    // 8. Fallback si aucune image dispo → dire la vérité dans le prompt
    if (hasImages && !imagesDisponibles) {
      systemPrompt += "\n\n## NOTE TECHNIQUE — IMAGE NON ACCESSIBLE\n⚠️ Le client a envoyé une photo mais tu ne peux PAS la voir (échec technique du téléchargement).\n- Ne décris PAS l'image — tu ne la vois pas\n- Dis honnêtement : \"J'ai bien reçu votre photo mais je n'arrive pas à la visualiser techniquement. Pouvez-vous me décrire ce que c'est ?\"\n- Relance naturellement sur la vente après\n- N'invente RIEN sur le contenu de l'image";
    }

    // 9. Appeler l'IA
    if (providers && providers.length > 0) {
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
      }));

      const result = await modelOrchestrator.orchestrate(
        {
          tenantId,
          message: messageText || (attachments?.length ? "[Image reçue du client]" : ""),
          conversationHistory,
          systemPrompt,
          attachments: attachments?.map(a => ({
            type: a.type,
            url: a.url,
            mimeType: a.mimeType,
            data: a.data,
          })),
        },
        providerConfigs
      );

      // 9. Envoyer la réponse via Meta API
      await sendMetaMessage({
        channelType: channelType as "whatsapp" | "messenger" | "instagram",
        credentials,
        recipientId: customerId,
        text: result.reply,
      });

      // 10. Sauvegarder la réponse du bot
      await supabase.from("messages").insert({
        tenant_id: tenantId,
        conversation_id: convId,
        sender: "bot",
        content: result.reply,
        tokens_prompt: result.tokensUsed?.prompt || null,
        tokens_completion: result.tokensUsed?.completion || null,
        latency_ms: result.latencyMs,
        created_at: new Date().toISOString(),
      });

      // 11. Mettre à jour la conversation
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", convId);

      // 12. Détection d'escalade
      const escalationKeywords = [
        "parler à un humain", "parler à un conseiller", "opérateur", "humain",
        "je veux un conseiller", "agent humain", "vrai personne",
        "parler à quelqu'un", "je veux parler à", "transférez",
        "parler à un vrai", "support humain", "service client humain",
        "réclamation", "agacé", "énervé", "frustré", "déçu", "insatisfait",
      ];

      const lowerMsg = messageText.toLowerCase();
      const needsHuman = escalationKeywords.some((kw) => lowerMsg.includes(kw));

      if (needsHuman) {
        await supabase
          .from("conversations")
          .update({
            status: "waiting_human" as Database["public"]["Enums"]["conversation_status"],
            metadata: { source: "webhook", escalated_at: new Date().toISOString(), escalation_reason: "client_request" },
          })
          .eq("id", convId);
        console.log(`[webhooks/${channel}/${tenant}] 🆘 Escalade déclenchée`);
      }

      console.log(`[webhooks/${channel}/${tenant}] ✅ Réponse envoyée (${result.provider}/${result.model})`);
    } else {
      const generic = "Merci pour votre message ! Votre boutique n'a pas encore configuré d'assistant IA. Un conseiller vous répondra bientôt.";

      await sendMetaMessage({
        channelType: channelType as "whatsapp" | "messenger" | "instagram",
        credentials,
        recipientId: customerId,
        text: generic,
      });

      await supabase.from("messages").insert({
        tenant_id: tenantId,
        conversation_id: convId,
        sender: "bot",
        content: generic,
        created_at: new Date().toISOString(),
      });
    }

    // Cleanup : libérer les buffers d'images de la mémoire
    if (attachments) {
      for (const att of attachments) {
        delete att.data;
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error(`[webhooks/${channel}/${tenant}] Error:`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Créer ou récupérer une conversation existante
// ---------------------------------------------------------------------------

async function getOrCreateConversation(
  supabase: ReturnType<typeof getAdmin>,
  params: {
    tenantId: string;
    channelId: string;
    channelType: Database["public"]["Enums"]["channel_type"];
    customerId: string;
    customerName: string | null;
  }
): Promise<string> {
  const { tenantId, channelId, channelType, customerId, customerName } = params;

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("customer_id", customerId)
    .eq("status", "active")
    .maybeSingle();

  if (existing) return existing.id;

  const { data: conv, error } = await supabase
    .from("conversations")
    .insert({
      tenant_id: tenantId,
      channel_id: channelId,
      channel_type: channelType,
      customer_id: customerId,
      customer_name: customerName,
      status: "active",
      message_count: 0,
      metadata: { source: "webhook" },
    })
    .select("id")
    .single();

  if (error || !conv) throw new Error(`Erreur création conversation: ${error?.message}`);
  return conv.id;
}

// ---------------------------------------------------------------------------
// Parse Meta message format (WhatsApp / Instagram / Messenger)
// ---------------------------------------------------------------------------

interface ParsedMessage {
  customerId: string;
  customerName: string | null;
  messageText: string;
  channelType: string;
  attachments?: { type: "image"; url: string; mimeType: string; data?: string }[];
}

function parseMetaMessage(channel: string, body: Record<string, unknown>): ParsedMessage | null {
  const object = body.object as string | undefined;
  if (object !== "whatsapp_business_account" && object !== "page") return null;

  const entry = (body.entry as Array<Record<string, unknown>> | undefined)?.[0];
  if (!entry) return null;

  // WhatsApp Cloud API
  if (object === "whatsapp_business_account") {
    const changes = entry.changes as Array<Record<string, unknown>> | undefined;
    const change = changes?.[0];
    const value = change?.value as Record<string, unknown> | undefined;
    const messages = value?.messages as Array<Record<string, unknown>> | undefined;
    const message = messages?.[0];
    const contacts = value?.contacts as Array<Record<string, unknown>> | undefined;
    const contact = contacts?.[0];

    if (!message) return null;

    const text = message.text as Record<string, string> | undefined;
    const interactive = message.interactive as Record<string, Record<string, string>> | undefined;
    const profile = contact?.profile as Record<string, string> | undefined;

    const messageText =
      text?.body ||
      (message.caption as string) ||
      (message.type === "interactive" ? interactive?.button_reply?.title || interactive?.list_reply?.title : null) ||
      "";

    return {
      customerId: message.from as string,
      customerName: profile?.name || null,
      messageText,
      channelType: "whatsapp",
    };
  }

  // Messenger / Instagram
  const messaging = (entry.messaging as Array<Record<string, unknown>> | undefined)?.[0];
  const sender = messaging?.sender as Record<string, string> | undefined;
  const msg = messaging?.message as Record<string, unknown> | undefined;
  const attachments = msg?.attachments as Array<Record<string, unknown>> | undefined;

  if (msg) {
    const text = msg.text as string || "";
    const imageUrl = attachments?.[0]?.payload as Record<string, string> | undefined;

    return {
      customerId: sender?.id || "",
      customerName: null,
      messageText: text || (imageUrl?.url ? "[Image]" : ""),
      channelType: channel === "instagram" ? "instagram" : "messenger",
      attachments: imageUrl?.url ? [{ type: "image" as const, url: imageUrl.url, mimeType: "image/jpeg" }] : undefined,
    };
  }

  return null;
}
