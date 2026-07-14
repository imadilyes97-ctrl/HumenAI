// ============================================================================
// HumenAI — Middleware
// Multi-tenant subdomain routing + Supabase session verification
// ============================================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/api/auth",
  "/api/webhooks",
  "/api/widget",
  "/widget",
];

const STATIC_PREFIXES = [
  "/_next/static",
  "/_next/image",
  "/favicon.ico",
  "/sitemap.xml",
  "/robots.txt",
];

// ---------------------------------------------------------------------------
// Helper — Vérification de session Supabase
// ---------------------------------------------------------------------------

/**
 * Vérifie si le cookie `humenai-access-token` correspond à une session
 * Supabase valide. Retourne l'utilisateur ou null.
 */
async function verifySession(
  accessToken: string
): Promise<{ id: string; tenantId: string | null } | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  const supabase = createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) return null;

  return {
    id: data.user.id,
    tenantId: (data.user.app_metadata?.tenant_id as string) ?? null,
  };
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") || "";

  // ---------------------------------------------------------------
  // 1. Ignorer les fichiers statiques
  // ---------------------------------------------------------------
  if (STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // ---------------------------------------------------------------
  // 2. Routes publiques — toujours autorisées
  // ---------------------------------------------------------------
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // ---------------------------------------------------------------
  // 3. Sous-domaine tenant (ex: maboutique.humenai.app)
  // ---------------------------------------------------------------
  const subdomain = hostname.split(".")[0];
  const isSubdomainTenant =
    subdomain &&
    !["www", "app", "localhost"].includes(subdomain) &&
    !hostname.includes("192.168.") &&
    !hostname.includes("127.0.0.1");

  if (isSubdomainTenant) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-tenant-slug", subdomain);

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // ---------------------------------------------------------------
  // 4. Routes protégées (dashboard + API) — vérification session
  // ---------------------------------------------------------------
  const isApiRoute = pathname.startsWith("/api/");
  const isDashboardRoute = pathname.startsWith("/dashboard");

  if (isDashboardRoute || isApiRoute) {
    const accessToken = request.cookies.get("humenai-access-token")?.value;

    // Pas de token
    if (!accessToken) {
      if (isApiRoute) {
        return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Vérifier le token auprès de Supabase
    const session = await verifySession(accessToken);

    if (!session) {
      // Token invalide ou expiré → supprimer les cookies
      const base = isApiRoute
        ? NextResponse.json({ error: "Session invalide" }, { status: 401 })
        : NextResponse.redirect(new URL("/login", request.url));

      base.cookies.delete("humenai-access-token");
      base.cookies.delete("humenai-refresh-token");

      return base;
    }

    // Session valide → forwarder les infos utilisateur aux routes protégées
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", session.id);
    requestHeaders.set("Authorization", `Bearer ${accessToken}`);

    if (session.tenantId) {
      requestHeaders.set("x-tenant-id", session.tenantId);
    }

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // ---------------------------------------------------------------
  // 5. Tout autre chemin — laisser passer
  // ---------------------------------------------------------------
  return NextResponse.next();
}

// ---------------------------------------------------------------------------
// Configuration du matcher
// ---------------------------------------------------------------------------

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
