// ============================================================================
// HumenAI — Server-side Auth Actions
// Ce fichier est réservé au serveur (API routes, server components).
// Ne pas importer depuis un composant client directement.
// ============================================================================

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import {
  getSupabaseBrowserClient,
  getSupabaseAdminClient,
  setUserTenantClaim,
} from "./client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SignUpParams {
  email: string;
  password: string;
  name: string;
}

export interface SignUpResult {
  tenant: Database["public"]["Tables"]["tenants"]["Row"];
  user: Database["public"]["Tables"]["users"]["Row"];
  session: {
    access_token: string;
    refresh_token: string;
  } | null;
}

export interface SignInParams {
  email: string;
  password: string;
}

export interface SignInResult {
  user: Database["public"]["Tables"]["users"]["Row"];
  session: {
    access_token: string;
    refresh_token: string;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Génère un slug lisible à partir d'un nom.
 * Supprime les accents, remplace les espaces par des tirets.
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

/**
 * Crée un client Supabase anonyme (anon key) sans persistance de session.
 * Utilisé pour les opérations de signIn / création de session côté serveur.
 */
function createTemporaryAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Variables d'environnement NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY manquantes"
    );
  }

  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

// ---------------------------------------------------------------------------
// signUp — Création complète d'un compte (tenant + user + session)
// ---------------------------------------------------------------------------

/**
 * Crée un nouveau tenant, son utilisateur admin, ses paramètres par défaut,
 * et retourne une session active.
 *
 * En cas d'échec à une étape, les étapes précédentes sont rollbackées :
 * tenant supprimé, utilisateur Supabase supprimé.
 */
export async function signUp({
  email,
  password,
  name,
}: SignUpParams): Promise<SignUpResult> {
  const admin = getSupabaseAdminClient();

  // -----------------------------------------------------------------------
  // 1. Créer le tenant
  // -----------------------------------------------------------------------
  const rawSlug = generateSlug(name);
  const slug = await ensureUniqueSlug(admin, rawSlug);

  const { data: tenant, error: tenantError } = await admin
    .from("tenants")
    .insert({ name, slug })
    .select()
    .single();

  if (tenantError || !tenant) {
    throw new Error(
      `Erreur lors de la création du tenant : ${tenantError?.message}`
    );
  }

  // -----------------------------------------------------------------------
  // 2. Créer l'utilisateur Supabase Auth
  // -----------------------------------------------------------------------
  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, tenant_id: tenant.id },
    });

  if (authError || !authData.user) {
    await admin.from("tenants").delete().eq("id", tenant.id);
    throw new Error(
      `Erreur lors de la création du compte : ${authError?.message}`
    );
  }

  // -----------------------------------------------------------------------
  // 3. Créer l'enregistrement dans la table `users`
  // -----------------------------------------------------------------------
  const { data: user, error: userError } = await admin
    .from("users")
    .insert({
      id: authData.user.id,
      tenant_id: tenant.id,
      email,
      name,
      role: "admin",
    })
    .select()
    .single();

  if (userError || !user) {
    await admin.from("tenants").delete().eq("id", tenant.id);
    await admin.auth.admin.deleteUser(authData.user.id);
    throw new Error(
      `Erreur lors de la création du profil : ${userError?.message}`
    );
  }

  // -----------------------------------------------------------------------
  // 4. Définir le claim tenant_id dans app_metadata (utilisé par RLS)
  // -----------------------------------------------------------------------
  try {
    await setUserTenantClaim(authData.user.id, tenant.id);
  } catch {
    // Non bloquant : le claim sera mis à jour à la prochaine connexion
    console.warn(
      "[auth.ts] Impossible de définir le claim tenant_id pour",
      authData.user.id
    );
  }

  // -----------------------------------------------------------------------
  // 5. Créer les paramètres par défaut du tenant
  // -----------------------------------------------------------------------
  const { error: settingsError } = await admin
    .from("tenant_settings")
    .insert({ tenant_id: tenant.id });

  if (settingsError) {
    // Non bloquant : les defaults sont gérés par la base de données
    console.error(
      "[auth.ts] Erreur création tenant_settings:",
      settingsError.message
    );
  }

  // -----------------------------------------------------------------------
  // 6. Connecter l'utilisateur pour obtenir une session
  // -----------------------------------------------------------------------
  const anonClient = createTemporaryAnonClient();
  const { data: signInData, error: signInError } =
    await anonClient.auth.signInWithPassword({ email, password });

  if (signInError || !signInData.session) {
    // Le compte existe mais la connexion automatique a échoué
    throw new Error(
      "Compte créé avec succès, mais échec de la connexion automatique."
    );
  }

  return {
    tenant,
    user,
    session: {
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
    },
  };
}

// ---------------------------------------------------------------------------
// signIn — Connexion utilisateur
// ---------------------------------------------------------------------------

/**
 * Authentifie un utilisateur avec email et mot de passe.
 * Retourne le profil depuis la table `users` et la session Supabase.
 */
export async function signIn({
  email,
  password,
}: SignInParams): Promise<SignInResult> {
  const anonClient = createTemporaryAnonClient();
  const { data, error } = await anonClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    throw new Error("Email ou mot de passe incorrect.");
  }

  // Récupérer le profil utilisateur depuis la table `users`
  const admin = getSupabaseAdminClient();
  const { data: user, error: userError } = await admin
    .from("users")
    .select("*")
    .eq("id", data.user.id)
    .single();

  if (userError || !user) {
    throw new Error(
      "Profil utilisateur introuvable. Contactez le support."
    );
  }

  // Mettre à jour la date de dernière connexion
  await admin
    .from("users")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", user.id);

  return {
    user,
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
  };
}

// ---------------------------------------------------------------------------
// signOut — Déconnexion
// ---------------------------------------------------------------------------

/**
 * Déconnecte l'utilisateur et vide la session du navigateur.
 * À appeler côté client uniquement.
 *
 * Note : les cookies `humenai-access-token` et `humenai-refresh-token`
 * doivent être supprimés par l'appelant (via API ou document.cookie).
 */
export async function signOut(): Promise<void> {
  const browserClient = getSupabaseBrowserClient();
  const { error } = await browserClient.auth.signOut();

  if (error) {
    throw new Error(`Erreur de déconnexion : ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// getSession — Récupération de la session
// ---------------------------------------------------------------------------

/**
 * Retourne la session Supabase active.
 * Fonctionne côté client (lit le stockage local du navigateur).
 * Côté serveur, privilégier `getServerUser(request)` depuis client.ts.
 */
export async function getSession() {
  const browserClient = getSupabaseBrowserClient();
  const { data, error } = await browserClient.auth.getSession();

  if (error) {
    throw new Error(`Erreur de session : ${error.message}`);
  }

  return data.session;
}

// ---------------------------------------------------------------------------
// Interne — Slug unique
// ---------------------------------------------------------------------------

/**
 * Vérifie si un slug existe déjà dans la table tenants.
 * Si oui, ajoute un suffixe court pour garantir l'unicité.
 */
async function ensureUniqueSlug(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  baseSlug: string
): Promise<string> {
  const { data: existing } = await admin
    .from("tenants")
    .select("slug")
    .eq("slug", baseSlug)
    .maybeSingle();

  if (!existing) return baseSlug;

  const suffix = Date.now().toString(36).slice(-4);
  return `${baseSlug}-${suffix}`;
}
