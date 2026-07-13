import { NextRequest, NextResponse } from "next/server";

// HumenAI — Chat API endpoint
// Handles incoming messages from all channels

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, message, conversationId, channelType } = body;

    if (!tenantId || !message) {
      return NextResponse.json(
        { error: "Missing required fields: tenantId, message" },
        { status: 400 }
      );
    }

    // TODO: Implement RAG + AI pipeline
    // 1. Load tenant configuration (prompt system, brand identity)
    // 2. Check knowledge base via RAG (Supabase pgvector)
    // 3. Generate response via AI provider (OpenAI/Anthropic)
    // 4. Log conversation to database
    // 5. Check if human handoff needed (sentiment analysis)

    // Temporary mock response
    const reply = `Merci pour votre message ! Je suis en cours de configuration pour le marchand ${tenantId}. Revenez bientôt.`;

    return NextResponse.json({
      reply,
      conversationId,
      tenantId,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "HumenAI Chat API",
    version: "0.1.0",
  });
}
