"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-brand-600">
            Humen<span className="font-light text-text-primary">AI</span>
          </Link>
          <h1 className="text-xl font-semibold mt-6">Connexion</h1>
          <p className="text-sm text-text-secondary mt-1">
            Accédez à votre tableau de bord marchand
          </p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="marchand@boutique.fr"
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="••••••••"
              required
              autoComplete="current-password"
              disabled={loading}
            />
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

          {/* Bouton de connexion */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 text-white py-2 rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Connexion en cours..." : "Se connecter"}
          </button>
        </form>

        {/* Lien vers inscription */}
        <p className="text-center text-sm text-text-secondary mt-6">
          Pas encore de compte ?{" "}
          <Link
            href="/register"
            className="text-brand-600 hover:underline font-medium"
          >
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}
