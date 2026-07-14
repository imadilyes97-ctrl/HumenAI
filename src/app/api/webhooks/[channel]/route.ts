// ============================================================================
// HumenAI — Legacy webhook receiver (sans tenant)
// Redirige vers le nouveau format /api/webhooks/{channel}/{tenant}
// Le nouveau format avec tenant slug est obligatoire pour le multi-tenant
// ============================================================================

import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channel: string }> }
) {
  const { channel } = await params;
  const searchParams = request.nextUrl.searchParams;
  const tenant = searchParams.get("tenant");

  if (tenant) {
    // Redirection vers le nouveau format
    return NextResponse.redirect(
      new URL(`/api/webhooks/${channel}/${tenant}${request.nextUrl.search}`, request.url)
    );
  }

  console.warn(`[webhooks/${channel}] ❌ Ancienne URL sans tenant. Utilisez /api/webhooks/${channel}/{votre-slug}`);
  return new NextResponse(
    "Ancienne URL. Veuillez inclure votre tenant slug : /api/webhooks/" + channel + "/votre-slug",
    { status: 400 }
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channel: string }> }
) {
  const { channel } = await params;
  const searchParams = request.nextUrl.searchParams;
  const tenant = searchParams.get("tenant");

  if (tenant) {
    return NextResponse.redirect(
      new URL(`/api/webhooks/${channel}/${tenant}${request.nextUrl.search}`, request.url)
    );
  }

  return NextResponse.json(
    { error: "Ancienne URL. Veuillez inclure votre tenant slug : /api/webhooks/" + channel + "/votre-slug" },
    { status: 400 }
  );
}
