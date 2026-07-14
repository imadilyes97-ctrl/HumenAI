// ============================================================================
// HumenAI — API Route Utilities
// Helper functions partagées par toutes les API routes du dashboard
// ============================================================================

import { NextRequest } from "next/server";
import { getTenantIdFromJWT } from "@/lib/supabase/client";

/**
 * Extrait le tenant_id depuis une requête API :
 * 1. Header x-tenant-id (forwardé par le middleware si dispo)
 * 2. Cookie humenai-access-token (JWT → app_metadata.tenant_id) en fallback
 */
export async function getApiTenantId(
  request: NextRequest
): Promise<string | null> {
  const headerId = request.headers.get("x-tenant-id");
  if (headerId) return headerId;

  const token = request.cookies.get("humenai-access-token")?.value;
  if (!token) return null;

  return getTenantIdFromJWT(token);
}
