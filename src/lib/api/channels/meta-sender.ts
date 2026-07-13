// ============================================================================
// HumenAI — Meta API Sender
// Envoie des messages via WhatsApp Cloud API, Messenger Send API, Instagram
// ============================================================================

interface SendMessageParams {
  channelType: "whatsapp" | "messenger" | "instagram";
  credentials: Record<string, string>;
  recipientId: string;
  text: string;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Envoie un message via l'API Meta appropriée selon le canal
 */
export async function sendMetaMessage(params: SendMessageParams): Promise<SendResult> {
  const { channelType, credentials, recipientId, text } = params;

  switch (channelType) {
    case "whatsapp":
      return sendWhatsApp(credentials, recipientId, text);
    case "messenger":
      return sendMessenger(credentials, recipientId, text);
    case "instagram":
      return sendInstagram(credentials, recipientId, text);
    default:
      return { success: false, error: `Canal non supporté: ${channelType}` };
  }
}

// ---------------------------------------------------------------------------
// WhatsApp Cloud API
// POST https://graph.facebook.com/v21.0/{phone_number_id}/messages
// ---------------------------------------------------------------------------

async function sendWhatsApp(
  creds: Record<string, string>,
  to: string,
  text: string
): Promise<SendResult> {
  const phoneNumberId = creds.phoneNumberId;
  const apiKey = creds.apiKey;

  if (!phoneNumberId || !apiKey) {
    return { success: false, error: "WhatsApp non configuré (phoneNumberId ou apiKey manquant)" };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: { preview_url: false, body: text },
        }),
        signal: AbortSignal.timeout(15000),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: `WhatsApp API ${res.status}: ${data.error?.message || JSON.stringify(data).slice(0, 200)}`,
      };
    }

    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (error) {
    return { success: false, error: `WhatsApp envoi échoué: ${error instanceof Error ? error.message : "inconnu"}` };
  }
}

// ---------------------------------------------------------------------------
// Messenger Send API
// POST https://graph.facebook.com/v21.0/me/messages
// ---------------------------------------------------------------------------

async function sendMessenger(
  creds: Record<string, string>,
  recipientId: string,
  text: string
): Promise<SendResult> {
  const accessToken = creds.accessToken;

  if (!accessToken) {
    return { success: false, error: "Messenger non configuré (accessToken manquant)" };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/me/messages?access_token=${accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text },
          messaging_type: "RESPONSE",
        }),
        signal: AbortSignal.timeout(15000),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: `Messenger API ${res.status}: ${data.error?.message || JSON.stringify(data).slice(0, 200)}`,
      };
    }

    return { success: true, messageId: data.message_id };
  } catch (error) {
    return { success: false, error: `Messenger envoi échoué: ${error instanceof Error ? error.message : "inconnu"}` };
  }
}

// ---------------------------------------------------------------------------
// Instagram Send API (via Messenger platform)
// POST https://graph.facebook.com/v21.0/me/messages
// ---------------------------------------------------------------------------

async function sendInstagram(
  creds: Record<string, string>,
  recipientId: string,
  text: string
): Promise<SendResult> {
  // Instagram utilise la même API que Messenger
  return sendMessenger(creds, recipientId, text);
}
