// ============================================================================
// HumenAI — POST /api/auth/register
// Crée un tenant, un utilisateur Supabase Auth, et retourne une session.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { signUp } from "@/lib/supabase/auth";
import type { Database } from "@/lib/supabase/database.types";

// ---------------------------------------------------------------------------
// Validation Zod
// ---------------------------------------------------------------------------

const RegisterBodySchema = z.object({
  name: z
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Le nom est trop long"),
  email: z
    .string()
    .email("Adresse email invalide")
    .max(255, "Email trop long"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .max(128, "Mot de passe trop long"),
  sector: z.string().max(100).optional(),
  channels: z.array(z.string().max(50)).max(20).optional(),
});

type RegisterBody = z.infer<typeof RegisterBodySchema>;

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

const ACCESS_TOKEN_MAX_AGE = 60 * 60; // 1 heure
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30; // 30 jours

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // --- Validation ---
    const body: unknown = await request.json();
    const parsed = RegisterBodySchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      const firstError = Object.values(errors).flat()[0];

      return NextResponse.json(
        {
          error: firstError ?? "Données invalides",
          details: errors,
        },
        { status: 400 }
      );
    }

    const { name, email, password, sector, channels } = parsed.data;

    // --- Inscription ---
    const result = await signUp({ email, password, name });

    // Mettre à jour le secteur dans les settings du tenant (optionnel)
    if (sector && result.tenant) {
      const { getSupabaseAdminClient } = await import("@/lib/supabase/client");
      const admin = getSupabaseAdminClient();
      const currentSettings =
        (result.tenant.settings as Record<string, unknown>) ?? {};
      await admin
        .from("tenants")
        .update({ settings: { ...currentSettings, sector } })
        .eq("id", result.tenant.id);
    }

    // Sauvegarder les canaux choisis pendant l'onboarding
    if (channels && channels.length > 0 && result.tenant) {
      const { getSupabaseAdminClient } = await import("@/lib/supabase/client");
      const admin = getSupabaseAdminClient();
      const now = new Date().toISOString();

      for (const ch of channels) {
        const type = ch.toLowerCase().replace(/\s+/g, "_") as Database["public"]["Enums"]["channel_type"];
        // Ignorer les types qui ne sont pas dans l'enum
        if (!["whatsapp","instagram","messenger","tiktok","shopify","woocommerce","wix","prestashop","magento","web_widget","email"].includes(type)) continue;

        await admin.from("channels").upsert({
          tenant_id: result.tenant.id,
          type,
          enabled: true,
          status: "disconnected",
          credentials: {},
          settings: {},
          created_at: now,
          updated_at: now,
        });
      }
    }

    // --- Cookie session ---
    if (result.session) {
      const response = NextResponse.json(
        {
          tenant: result.tenant,
          user: result.user,
          session: result.session,
        },
        { status: 201 }
      );

      response.cookies.set(
        "humenai-access-token",
        result.session.access_token,
        { ...COOKIE_OPTIONS, maxAge: ACCESS_TOKEN_MAX_AGE }
      );
      response.cookies.set(
        "humenai-refresh-token",
        result.session.refresh_token,
        { ...COOKIE_OPTIONS, maxAge: REFRESH_TOKEN_MAX_AGE }
      );

      return response;
    }

    // Compte créé mais pas de session (cas rare)
    return NextResponse.json(
      {
        tenant: result.tenant,
        user: result.user,
        session: null,
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur interne du serveur";

    console.error("[POST /api/auth/register]", message);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
