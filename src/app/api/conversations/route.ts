import { NextRequest, NextResponse } from "next/server";

// HumenAI — Conversations API

export async function GET(request: NextRequest) {
  const tenantId = request.headers.get("x-tenant-id");
  const searchParams = request.nextUrl.searchParams;
  const _status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "50");

  if (!tenantId) {
    return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
  }

  // TODO: Fetch conversations from database with tenant isolation
  return NextResponse.json({
    conversations: [],
    total: 0,
    limit,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, message } = body;

    if (!tenantId || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // TODO: Create conversation + initial message
    // 1. Find or create conversation by tenantId + customerId
    // 2. Add message to conversation
    // 3. Process via AI pipeline
    // 4. Return response

    return NextResponse.json({
      conversationId: `conv_${Date.now()}`,
      reply: "Message reçu. Traitement en cours...",
    });
  } catch (error) {
    console.error("Conversation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
