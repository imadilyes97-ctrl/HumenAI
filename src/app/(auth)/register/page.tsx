"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AccountForm {
  name: string;
  email: string;
  password: string;
}

interface OnboardingForm {
  sector: string;
  channels: string[];
}

type Step = "account" | "onboarding";

// ---------------------------------------------------------------------------
// Secteurs disponibles
// ---------------------------------------------------------------------------

const SECTORS = [
  "Mode & Accessoires",
  "Électronique",
  "Cosmétique & Beauté",
  "Alimentaire",
  "Maison & Déco",
  "Santé & Bien-être",
  "Sport & Loisirs",
  "Services",
  "Autre",
] as const;

// ---------------------------------------------------------------------------
// Canaux disponibles
// ---------------------------------------------------------------------------

const CHANNELS = [
  "WhatsApp",
  "Instagram",
  "Messenger",
  "TikTok",
  "Widget Web",
  "Email",
] as const;

// ---------------------------------------------------------------------------
// Page d'inscription
// ---------------------------------------------------------------------------

export default function RegisterPage() {
  const router = useRouter();

  // État partagé entre les étapes
  const [step, setStep] = useState<Step>("account");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Étape 1 — Infos compte
  const [account, setAccount] = useState<AccountForm>({
    name: "",
    email: "",
    password: "",
  });

  // Étape 2 — Onboarding
  const [onboarding, setOnboarding] = useState<OnboardingForm>({
    sector: "",
    channels: [],
  });

  // -----------------------------------------------------------------------
  // Étape 1 — Soumission du compte
  // -----------------------------------------------------------------------

  const handleAccountSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // Validation minimale
    if (account.password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    // Passer à l'étape onboarding
    setStep("onboarding");
  };

  // -----------------------------------------------------------------------
  // Étape 2 — Finalisation inscription
  // -----------------------------------------------------------------------

  const handleFinalSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: account.name,
          email: account.email,
          password: account.password,
          sector: onboarding.sector || undefined,
          channels: onboarding.channels.length > 0 ? onboarding.channels : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Une erreur est survenue. Veuillez réessayer.");
        return;
      }

      // Synchroniser la session avec le client Supabase
      if (data.session) {
        const supabase = getSupabaseBrowserClient();
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      router.push("/dashboard");
    } catch {
      setError("Impossible de contacter le serveur. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------------------------------
  // Gestion des événements onboarding
  // -----------------------------------------------------------------------

  const toggleChannel = (channel: string) => {
    setOnboarding((prev) => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter((c) => c !== channel)
        : [...prev.channels, channel],
    }));
  };

  // -----------------------------------------------------------------------
  // Rendu
  // -----------------------------------------------------------------------

  // Étape 2 — Onboarding
  if (step === "onboarding") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/" className="text-2xl font-bold text-brand-600">
              Humen<span className="font-light text-text-primary">AI</span>
            </Link>
            <h2 className="text-xl font-semibold mt-6">
              Configurez votre assistant
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              Personnalisez votre expérience en quelques clics
            </p>
          </div>

          <div className="space-y-6">
            {/* Secteur d'activité */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Secteur d&apos;activité
              </label>
              <select
                value={onboarding.sector}
                onChange={(e) =>
                  setOnboarding((prev) => ({
                    ...prev,
                    sector: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                disabled={loading}
              >
                <option value="">Sélectionnez votre secteur</option>
                {SECTORS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Canaux souhaités */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Canaux souhaités
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CHANNELS.map((channel) => {
                  const isSelected = onboarding.channels.includes(channel);
                  return (
                    <label
                      key={channel}
                      className={`flex items-center gap-2 p-2 border rounded-lg text-sm cursor-pointer transition-colors ${
                        isSelected
                          ? "border-brand-500 bg-brand-50"
                          : "border-border hover:bg-surface-secondary"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleChannel(channel)}
                        className="accent-brand-600"
                        disabled={loading}
                      />
                      {channel}
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-text-secondary mt-1">
                Vous pourrez configurer et ajouter des canaux plus tard.
              </p>
            </div>

            {/* Message d'erreur */}
            {error && (
              <div
                role="alert"
                className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2"
              >
                {error}
              </div>
            )}

            {/* Boutons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep("account")}
                disabled={loading}
                className="flex-1 border border-border text-text-primary py-2 rounded-lg font-medium hover:bg-surface-secondary transition-colors disabled:opacity-50"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={loading}
                className="flex-1 bg-brand-600 text-white py-2 rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Création en cours..." : "Créer mon compte"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Étape 1 — Infos compte
  // -----------------------------------------------------------------------

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-brand-600">
            Humen<span className="font-light text-text-primary">AI</span>
          </Link>
          <h1 className="text-xl font-semibold mt-6">Créer mon compte</h1>
          <p className="text-sm text-text-secondary mt-1">
            Déployez votre assistant IA en quelques minutes
          </p>
        </div>

        {/* Formulaire étape 1 */}
        <form onSubmit={handleAccountSubmit} className="space-y-4">
          {/* Nom */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Nom de la boutique
            </label>
            <input
              id="name"
              type="text"
              value={account.name}
              onChange={(e) =>
                setAccount((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Ma Boutique"
              required
              disabled={loading}
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email professionnel
            </label>
            <input
              id="email"
              type="email"
              value={account.email}
              onChange={(e) =>
                setAccount((prev) => ({ ...prev, email: e.target.value }))
              }
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="contact@boutique.fr"
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>

          {/* Mot de passe */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-1"
            >
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={account.password}
              onChange={(e) =>
                setAccount((prev) => ({ ...prev, password: e.target.value }))
              }
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Minimum 8 caractères"
              required
              minLength={8}
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          {/* Conditions */}
          <p className="text-xs text-text-secondary">
            En créant un compte, vous acceptez nos{" "}
            <Link href="#" className="text-brand-600 hover:underline">
              conditions d&apos;utilisation
            </Link>{" "}
            et notre{" "}
            <Link href="#" className="text-brand-600 hover:underline">
              politique de confidentialité
            </Link>
            .
          </p>

          {/* Message d'erreur */}
          {error && (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2"
            >
              {error}
            </div>
          )}

          {/* Bouton suivant */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 text-white py-2 rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            Suivant
          </button>
        </form>

        {/* Lien vers connexion */}
        <p className="text-center text-sm text-text-secondary mt-6">
          Déjà un compte ?{" "}
          <Link
            href="/login"
            className="text-brand-600 hover:underline font-medium"
          >
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
