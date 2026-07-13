"use client";

import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [step, setStep] = useState<"account" | "onboarding">("account");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // TODO: Implement registration + onboarding wizard
    setLoading(false);
  };

  if (step === "onboarding") {
    return <OnboardingWizard onComplete={() => setStep("account")} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-brand-600">
            Humen<span className="font-light text-text-primary">AI</span>
          </Link>
          <h1 className="text-xl font-semibold mt-6">Créer mon compte</h1>
          <p className="text-sm text-text-secondary mt-1">
            Déployez votre assistant IA en quelques minutes
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Nom de la boutique
            </label>
            <input
              id="name"
              type="text"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Ma Boutique"
              required
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email professionnel
            </label>
            <input
              id="email"
              type="email"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="contact@boutique.fr"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="••••••••"
              required
            />
          </div>

          <p className="text-xs text-text-secondary">
            En créant un compte, vous acceptez nos{" "}
            <Link href="#" className="text-brand-600 hover:underline">conditions {"d'"}utilisation</Link>{" "}
            et notre{" "}
            <Link href="#" className="text-brand-600 hover:underline">politique de confidentialité</Link>.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 text-white py-2 rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Création..." : "Créer mon compte"}
          </button>
        </form>

        <p className="text-center text-sm text-text-secondary mt-6">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-brand-600 hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}

function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <h2 className="text-2xl font-bold mb-4">Configurez votre assistant</h2>
        <p className="text-text-secondary mb-8">
          Quelques informations pour personnaliser votre chatbot.
        </p>

        <div className="space-y-4 text-left">
          <div>
            <label className="block text-sm font-medium mb-1">Secteur {"d'"}activité</label>
            <select className="w-full px-3 py-2 border border-border rounded-lg text-sm">
              <option>Mode & Accessoires</option>
              <option>Électronique</option>
              <option>Cosmétique & Beauté</option>
              <option>Alimentaire</option>
              <option>Maison & Déco</option>
              <option>Autre</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Canaux souhaités</label>
            <div className="grid grid-cols-2 gap-2">
              {["WhatsApp", "Instagram", "Messenger", "TikTok", "Widget Web", "Email"].map(
                (channel) => (
                  <label
                    key={channel}
                    className="flex items-center gap-2 p-2 border border-border rounded-lg text-sm cursor-pointer hover:bg-surface-secondary"
                  >
                    <input type="checkbox" className="accent-brand-600" />
                    {channel}
                  </label>
                )
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onComplete}
          className="mt-8 w-full bg-brand-600 text-white py-2 rounded-lg font-medium hover:bg-brand-700 transition-colors"
        >
          Terminer la configuration
        </button>
      </div>
    </div>
  );
}
