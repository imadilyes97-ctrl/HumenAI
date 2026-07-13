// ============================================================================
// HumenAI — POST /api/auth/login
// Authentifie un utilisateur et retourne une session.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { signIn } from "@/lib/supabase/auth";

// ---------------------------------------------------------------------------
// Validation Zod
// ---------------------------------------------------------------------------

const LoginBodySchema = z.object({
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

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
// POST /api/auth/login
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // --- Validation ---
    const body: unknown = await request.json();
    const parsed = LoginBodySchema.safeParse(body);

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

    const { email, password } = parsed.data;

    // --- Connexion ---
    const result = await signIn({ email, password });

    // --- Cookie session ---
    const response = NextResponse.json(
      {
        user: result.user,
        session: result.session,
      },
      { status: 200 }
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
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur interne du serveur";

    console.error("[POST /api/auth/login]", message);

    return NextResponse.json(
      { error: message },
      { status: 401 }
    );
  }
}
