import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { getApiTenantId } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const tenantId = await getApiTenantId(request);
  if (!tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const supabase = getSupabaseServerClient(request);
  const { data } = await supabase.from("tenant_settings").select("*").eq("tenant_id", tenantId).single();
  return NextResponse.json(data || {});
}

export async function PUT(request: NextRequest) {
  try {
    const tenantId = await getApiTenantId(request);
    const body = await request.json();
    if (!tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const supabase = getSupabaseServerClient(request);
    const { error } = await supabase.from("tenant_settings").update(body).eq("tenant_id", tenantId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ message: "Paramètres enregistrés" });
  } catch (e) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
