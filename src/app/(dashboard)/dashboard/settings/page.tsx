"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Configuration</h1>
        <p className="text-sm text-text-secondary mt-1">
          Personnalisez le comportement de votre assistant IA.
        </p>
      </div>

      {/* Brand Identity */}
      <section className="bg-white rounded-xl border border-border p-6 space-y-4">
        <h2 className="font-semibold">Identité & Personnalité</h2>

        <div>
          <label className="block text-sm font-medium mb-1">Nom du chatbot</label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-border rounded-lg text-sm"
            placeholder="Assistant Boutique"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Ton de la marque</label>
          <select className="w-full px-3 py-2 border border-border rounded-lg text-sm">
            <option>Professionnel</option>
            <option>Amical</option>
            <option>Humoristique</option>
            <option>Direct</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Langue principale</label>
          <select className="w-full px-3 py-2 border border-border rounded-lg text-sm">
            <option>Français</option>
            <option>Anglais</option>
            <option>Arabe</option>
            <option>Espagnol</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Message de bienvenue</label>
          <textarea
            className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-none"
            rows={3}
            placeholder="Bonjour ! Je suis l'assistant virtuel de [Boutique]. Comment puis-je vous aider ?"
          />
        </div>
      </section>

      {/* Knowledge Base */}
      <section className="bg-white rounded-xl border border-border p-6 space-y-4">
        <h2 className="font-semibold">Base de connaissances</h2>
        <p className="text-sm text-text-secondary">
          Téléchargez vos documents (FAQ, CGV, politique de retour) pour enrichir les r&eacute;ponses de {"l'"}IA.
        </p>
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <p className="text-sm text-text-secondary">
            Glissez-déposez vos fichiers ici, ou{" "}
            <button className="text-brand-600 hover:underline">parcourez</button>
          </p>
          <p className="text-xs text-text-secondary mt-1">PDF, DOCX, TXT — 10 MB max</p>
        </div>
      </section>

      <button
        onClick={handleSave}
        className="bg-brand-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-brand-700 transition-colors"
      >
        {saved ? "✓ Enregistré" : "Enregistrer"}
      </button>
    </div>
  );
}
