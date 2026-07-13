"use client";

import { useState, useEffect } from "react";

type ProviderName = "openai" | "anthropic" | "google" | "mistral" | "deepseek" | "openrouter";

const PROVIDERS = [
  { id: "openai" as ProviderName, label: "OpenAI", icon: "🤖", color: "#00A67E", capabilities: ["📝 Texte", "🖼️ Image", "🎤 Vocal"], models: ["gpt-4o", "gpt-4o-mini", "gpt-4o-audio-preview"] },
  { id: "anthropic" as ProviderName, label: "Anthropic", icon: "🔮", color: "#D97757", capabilities: ["📝 Texte", "🖼️ Image"], models: ["claude-sonnet-4", "claude-haiku-3.5"] },
  { id: "google" as ProviderName, label: "Google Gemini", icon: "⚡", color: "#4285F4", capabilities: ["📝 Texte", "🖼️ Image", "🎤 Vocal"], models: ["gemini-2.5-flash", "gemini-2.5-pro"] },
  { id: "mistral" as ProviderName, label: "Mistral", icon: "🌬️", color: "#F97316", capabilities: ["📝 Texte"], models: ["mistral-large", "mistral-small"] },
  { id: "deepseek" as ProviderName, label: "DeepSeek", icon: "🧠", color: "#4F46E5", capabilities: ["📝 Texte"], models: ["deepseek-chat", "deepseek-r1"] },
  { id: "openrouter" as ProviderName, label: "OpenRouter", icon: "🔀", color: "#8B5CF6", capabilities: ["📝 Texte", "🖼️ Image"], models: ["openrouter/auto"] },
];

interface ProviderConfig {
  id: string;
  provider: ProviderName;
  label: string;
  apiKey: string;
  models: string[];
  defaultModel: string;
  isActive: boolean;
  priority: number;
}

export default function SettingsPage() {
  const [configs, setConfigs] = useState<ProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<ProviderName | null>(null);
  const [globalSaved, setGlobalSaved] = useState(false);

  useEffect(() => {
    loadProviders();
  }, []);

  async function loadProviders() {
    try {
      const res = await fetch("/api/models");
      if (res.ok) {
        const data = await res.json();
        setConfigs(data.providers || []);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  function isProviderConnected(provider: ProviderName): boolean {
    return configs.some((c) => c.provider === provider && c.isActive);
  }

  function getProviderConfig(provider: ProviderName): ProviderConfig | undefined {
    return configs.find((c) => c.provider === provider);
  }

  return (
    <div className="max-w-3xl space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold">Configuration</h1>
        <p className="text-sm text-text-secondary mt-1">
          Gérez {"l'"}identité de votre chatbot et les modèles IA utilisés.
        </p>
      </div>

      {/* ============ MODÈLES IA ============ */}
      <section className="bg-white rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-lg">🤖 Modèles IA</h2>
            <p className="text-sm text-text-secondary">
              Connectez vos propres clés API. Le message est routé automatiquement vers le meilleur modèle selon son type.
            </p>
          </div>
        </div>

        {/* Mapping capabilities → routing */}
        <div className="bg-brand-50 border border-brand-200 rounded-lg p-3 mb-6 text-sm text-brand-800">
          <strong>⚡ Routage automatique :</strong> Selon le message reçu du client :
          <ul className="mt-1 space-y-0.5">
            <li>• 📝 <strong>Texte seul</strong> → modèle texte (priorité 1)</li>
            <li>• 🖼️ <strong>Texte + Image</strong> → modèle vision (priorité 1)</li>
            <li>• 🎤 <strong>Texte + Audio/Vocal</strong> → modèle audio (priorité 1)</li>
            <li>• 🔄 <strong>Fallback</strong> → si le premier modèle échoue, le suivant prend le relais</li>
          </ul>
        </div>

        {loading ? (
          <p className="text-sm text-text-secondary">Chargement...</p>
        ) : (
          <div className="space-y-3">
            {PROVIDERS.map((p) => {
              const connected = isProviderConnected(p.id);
              return (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-surface-secondary transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{p.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{p.label}</p>
                        {connected && (
                          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">Connecté</span>
                        )}
                      </div>
                      <div className="flex gap-1 mt-0.5">
                        {p.capabilities.map((cap) => (
                          <span key={cap} className="text-xs text-text-secondary">{cap}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveModal(p.provider)}
                    className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      connected
                        ? "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                        : "bg-brand-600 text-white hover:bg-brand-700"
                    }`}
                  >
                    {connected ? "Modifier" : "Connecter"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ============ IDENTITÉ ============ */}
      <section className="bg-white rounded-xl border border-border p-6 space-y-4">
        <h2 className="font-semibold">🎨 Identité & Personnalité</h2>
        <div>
          <label className="block text-sm font-medium mb-1">Nom du chatbot</label>
          <input type="text" className="w-full px-3 py-2 border border-border rounded-lg text-sm" placeholder="Assistant Boutique" />
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
          <label className="block text-sm font-medium mb-1">Message de bienvenue</label>
          <textarea className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-none" rows={2} placeholder="Bonjour ! Comment puis-je vous aider ?" />
        </div>
      </section>

      {/* ============ BASE DE CONNAISSANCES ============ */}
      <section className="bg-white rounded-xl border border-border p-6 space-y-4">
        <h2 className="font-semibold">📚 Base de connaissances</h2>
        <p className="text-sm text-text-secondary">
          Téléchargez vos documents (FAQ, CGV, politique) pour enrichir les réponses.
        </p>
        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
          <p className="text-sm text-text-secondary">
            Glissez-déposez vos fichiers ici, ou <button className="text-brand-600 hover:underline">parcourez</button>
          </p>
          <p className="text-xs text-text-secondary mt-1">PDF, TXT, MD — 10 MB max</p>
        </div>
      </section>

      <button onClick={() => { setGlobalSaved(true); setTimeout(() => setGlobalSaved(false), 2000); }}
        className="bg-brand-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-brand-700 transition-colors">
        {globalSaved ? "✓ Enregistré" : "Enregistrer"}
      </button>

      {/* ============ MODAL CONNECTER PROVIDER ============ */}
      {activeModal && (
        <ProviderModal
          provider={PROVIDERS.find((p) => p.id === activeModal)!}
          existingConfig={getProviderConfig(activeModal)}
          onClose={() => setActiveModal(null)}
          onSaved={() => { setActiveModal(null); loadProviders(); }}
        />
      )}
    </div>
  );
}

// ============================================================
// PROVIDER MODAL
// ============================================================
function ProviderModal({
  provider,
  existingConfig,
  onClose,
  onSaved,
}: {
  provider: typeof PROVIDERS[0];
  existingConfig?: ProviderConfig;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [apiKey, setApiKey] = useState(existingConfig?.apiKey || "");
  const [selectedModel, setSelectedModel] = useState(existingConfig?.defaultModel || provider.models[0]);
  const [priority, setPriority] = useState(existingConfig?.priority || 1);
  const [isActive, setIsActive] = useState(existingConfig?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setResult(null);

    try {
      const res = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: provider.id,
          apiKey,
          defaultModel: selectedModel,
          isActive,
          priority,
        }),
      });

      const data = await res.json();
      setResult({
        ok: res.ok,
        message: data.message || (res.ok ? "Connecté !" : "Erreur inconnue"),
      });
      if (res.ok) setTimeout(onSaved, 1500);
    } catch {
      setResult({ ok: false, message: "Erreur réseau — vérifiez que le serveur tourne" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full animate-fade-in">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{provider.icon}</span>
            <div>
              <h2 className="text-lg font-bold" style={{ color: provider.color }}>{provider.label}</h2>
              <div className="flex gap-1 mt-0.5">
                {provider.capabilities.map((cap) => (
                  <span key={cap} className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-text-secondary">{cap}</span>
                ))}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-secondary text-text-secondary">✕</button>
        </div>

        <form onSubmit={handleConnect} className="p-6 space-y-4">
          <p className="text-xs text-text-secondary">
            Entrez votre clé API {provider.label}. Vos clés sont chiffrées et jamais partagées.
          </p>

          <div>
            <label className="block text-sm font-medium mb-1.5">Clé API</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Modèle par défaut</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm"
            >
              {provider.models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-brand-600" />
              Actif
            </label>
            <div className="flex items-center gap-2 text-sm">
              <label>Priorité :</label>
              <input type="number" min={1} max={10} value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value))}
                className="w-16 px-2 py-1 border border-border rounded-lg text-sm text-center" />
            </div>
          </div>

          {result && (
            <div className={`p-3 rounded-xl text-sm ${result.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {result.message}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl font-medium text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: provider.color }}>
              {saving ? "Connexion..." : existingConfig ? "Mettre à jour" : "Connecter"}
            </button>
            <button type="button" onClick={onClose}
              className="px-6 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-surface-secondary">
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
