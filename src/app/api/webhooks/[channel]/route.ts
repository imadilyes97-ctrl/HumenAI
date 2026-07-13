import { NextRequest, NextResponse } from "next/server";

// HumenAI — Webhook receiver for all channels
// Handles incoming messages from WhatsApp, Instagram, Messenger, TikTok, etc.

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channel: string }> }
) {
  const { channel } = await params;

  try {
    const body = await request.json();
    const signature = request.headers.get("x-signature") || "";

    // TODO: Verify webhook signature per channel
    // WhatsApp: validate signature with Meta App Secret
    // Instagram: validate via Facebook App Secret
    // TikTok: validate via TikTok App Secret

    // TODO: Route to message processing pipeline
    switch (channel) {
      case "whatsapp":
        return handleWhatsAppWebhook(body, signature);
      case "instagram":
        return handleInstagramWebhook(body, signature);
      case "messenger":
        return handleMessengerWebhook(body, signature);
      case "tiktok":
        return handleTikTokWebhook(body, signature);
      default:
        return NextResponse.json(
          { error: `Unsupported channel: ${channel}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error(`Webhook error (${channel}):`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// WhatsApp verification endpoint (Meta requirement)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channel: string }> }
) {
  const { channel } = await params;

  if (channel === "whatsapp") {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    // TODO: Verify token against stored value
    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return new NextResponse(challenge, { status: 200 });
    }
    return new NextResponse("Verification failed", { status: 403 });
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

// Channel-specific handlers
async function handleWhatsAppWebhook(body: unknown, signature: string) {
  // Meta WhatsApp Cloud API format
  // {
  //   object: "whatsapp_business_account",
  //   entry: [{ changes: [{ value: { messages: [{ from, text, ... }] } }] }]
  // }
  console.log("WhatsApp webhook received:", { body, signature });
  return NextResponse.json({ status: "ok" });
}

async function handleInstagramWebhook(body: unknown, signature: string) {
  console.log("Instagram webhook received:", { body, signature });
  return NextResponse.json({ status: "ok" });
}

async function handleMessengerWebhook(body: unknown, signature: string) {
  console.log("Messenger webhook received:", { body, signature });
  return NextResponse.json({ status: "ok" });
}

async function handleTikTokWebhook(body: unknown, signature: string) {
  console.log("TikTok webhook received:", { body, signature });
  return NextResponse.json({ status: "ok" });
}
