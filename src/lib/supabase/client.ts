// ============================================================================
// HumenAI — Supabase Client Utilities
// Multi-tenant aware: automatically forwards tenant context + RLS headers
// ============================================================================

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ---------------------------------------------------------------------------
// Browser client (singleton)
// ---------------------------------------------------------------------------
let browserClient: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Supabase client for the browser.
 * RLS runs automatically with the logged-in user's JWT.
 */
export function getSupabaseBrowserClient() {
  if (browserClient) return browserClient;

  browserClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
}

// ---------------------------------------------------------------------------
// Server client — with tenant context from request headers
// ---------------------------------------------------------------------------
/**
 * Supabase client for Next.js API routes.
 * Uses the request's Authorization header (user JWT) for RLS.
 * Forwards the x-tenant-id header for multi-tenant middleware support.
 */
export function getSupabaseServerClient(request: Request) {
  const authHeader = request.headers.get("Authorization") ?? "";

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: authHeader,
        "x-tenant-id": request.headers.get("x-tenant-id") ?? "",
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Service role client (bypasses RLS — admin only!)
// ---------------------------------------------------------------------------
let adminClient: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Supabase client using the service_role key.
 * BYPASSES RLS — use only in trusted server contexts:
 * - Tenant creation
 * - User invitation (JWT claim injection)
 * - Webhook handlers
 * - Background jobs / CRON
 */
export function getSupabaseAdminClient() {
  if (adminClient) return adminClient;

  adminClient = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return adminClient;
}

// ---------------------------------------------------------------------------
// Tenant JWT claim management
// ---------------------------------------------------------------------------

/**
 * Sets the tenant_id claim in the auth user's app_metadata.
 * Called after a user is created or invited to a tenant.
 *
 * This is what powers the `auth.current_tenant_id()` RLS helper.
 */
export async function setUserTenantClaim(
  userId: string,
  tenantId: string
): Promise<void> {
  const admin = getSupabaseAdminClient();

  const { error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { tenant_id: tenantId },
  });

  if (error) {
    throw new Error(
      `Failed to set tenant claim for user ${userId}: ${error.message}`
    );
  }
}

/**
 * Removes the tenant_id claim from a user's app_metadata.
 * Called when a user is removed from a tenant.
 */
export async function removeUserTenantClaim(
  userId: string
): Promise<void> {
  const admin = getSupabaseAdminClient();

  const { error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { tenant_id: null },
  });

  if (error) {
    throw new Error(
      `Failed to remove tenant claim for user ${userId}: ${error.message}`
    );
  }
}

/**
 * Gets the Supabase Auth user for the current session on the server.
 */
export async function getServerUser(request: Request) {
  const supabase = getSupabaseServerClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// ---------------------------------------------------------------------------
// getTenantIdFromJWT — extrait le tenant_id depuis un token JWT
// Fallback pour les API routes si le middleware n'a pas forwardé x-tenant-id
// ---------------------------------------------------------------------------

/**
 * Extrait le tenant_id depuis un access token JWT Supabase.
 * Utilisé comme fallback dans les API routes.
 */
export async function getTenantIdFromJWT(
  accessToken: string
): Promise<string | null> {
  try {
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data } = await supabase.auth.getUser(accessToken);
    return (data?.user?.app_metadata?.tenant_id as string) ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Type helper — extracts row type from a table name
// ---------------------------------------------------------------------------
export type TableRow<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TableInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TableUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
