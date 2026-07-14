import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";

// HumenAI — Tenant management API

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get("x-tenant-id");

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID requis" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient(request);
    const { data: tenant, error } = await supabase
      .from("tenants")
      .select("id, name, slug, plan, settings, created_at")
      .eq("id", tenantId)
      .single();

    if (error || !tenant) {
      return NextResponse.json({ error: "Tenant introuvable" }, { status: 404 });
    }

    return NextResponse.json(tenant);
  } catch (error) {
    console.error("Tenant GET error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
