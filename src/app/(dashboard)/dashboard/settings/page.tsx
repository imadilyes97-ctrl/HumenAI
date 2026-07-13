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

interface TenantSettings {
  chatbot_name: string;
  brand_tone: string;
  primary_language: string;
  allow_emojis: boolean;
  greeting_message: string;
  similarity_threshold: number;
  max_chunks: number;
}

const DEFAULT_SETTINGS: TenantSettings = {
  chatbot_name: "",
  brand_tone: "Professionnel",
  primary_language: "fr",
  allow_emojis: true,
  greeting_message: "",
  similarity_threshold: 0.7,
  max_chunks: 5,
};

const LANGUAGES = [
  { value: "fr", label: "Francais" },
  { value: "en", label: "English" },
  { value: "es", label: "Espanol" },
  { value: "de", label: "Deutsch" },
  { value: "it", label: "Italiano" },
  { value: "pt", label: "Portugues" },
  { value: "nl", label: "Nederlands" },
  { value: "ar", label: "العربية" },
];

const BRAND_TONES = ["Professionnel", "Amical", "Humoristique", "Direct", "Luxe", "Pedagogique"];

export default function SettingsPage() {
  const [configs, setConfigs] = useState<ProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<ProviderName | null>(null);

  const [settings, setSettings] = useState<TenantSettings>(DEFAULT_SETTINGS);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    loadProviders();
    loadSettings();
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

  async function loadSettings() {
    try {
      const res = await fetch("/api/tenants/settings");
      if (res.ok) {
        const data = await res.json();
        if (data && Object.keys(data).length > 0) {
          setSettings({
            chatbot_name: data.chatbot_name ?? "",
            brand_tone: data.brand_tone ?? "Professionnel",
            primary_language: data.primary_language ?? "fr",
            allow_emojis: data.allow_emojis ?? true,
            greeting_message: data.greeting_message ?? "",
            similarity_threshold: data.similarity_threshold ?? 0.7,
            max_chunks: data.max_chunks ?? 5,
          });
        }
      }
    } catch { /* silent */ }
    finally { setSettingsLoading(false); }
  }

  async function handleSave() {
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/tenants/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatbot_name: settings.chatbot_name,
          brand_tone: settings.brand_tone,
          primary_language: settings.primary_language,
          allow_emojis: settings.allow_emojis,
          greeting_message: settings.greeting_message,
          similarity_threshold: settings.similarity_threshold,
          max_chunks: settings.max_chunks,
        }),
      });

      if (res.ok) {
        setFeedback({ type: "success", message: "Parametres enregistres" });
      } else {
        const data = await res.json();
        setFeedback({ type: "error", message: data.error || "Erreur lors de l'enregistrement" });
      }
    } catch {
      setFeedback({ type: "error", message: "Erreur reseau" });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  }

  function updateField<K extends keyof TenantSettings>(key: K, value: TenantSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
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
          Gerer {"l'"}identite de votre chatbot et les modeles IA utilises.
        </p>
      </div>

      {/* ============ MODELES IA ============ */}
      <section className="bg-white rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-lg">🤖 Modeles IA</h2>
            <p className="text-sm text-text-secondary">
              Connectez vos propres cles API. Le message est route automatiquement vers le meilleur modele selon son type.
            </p>
          </div>
        </div>

        <div className="bg-brand-50 border border-brand-200 rounded-lg p-3 mb-6 text-sm text-brand-800">
          <strong>⚡ Routage automatique :</strong> Selon le message recu du client :
          <ul className="mt-1 space-y-0.5">
            <li>• <strong>Texte seul</strong> → modele texte (priorite 1)</li>
            <li>• <strong>Texte + Image</strong> → modele vision (priorite 1)</li>
            <li>• <strong>Texte + Audio/Vocal</strong> → modele audio (priorite 1)</li>
            <li>• <strong>Fallback</strong> → si le premier modele echoue, le suivant prend le relais</li>
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
                          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">Connecte</span>
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
                    onClick={() => setActiveModal(p.id)}
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

      {/* ============ IDENTITE & PERSONNALITE ============ */}
      <section className="bg-white rounded-xl border border-border p-6 space-y-4">
        <h2 className="font-semibold"> Identite & Personnalite</h2>

        {settingsLoading ? (
          <p className="text-sm text-text-secondary">Chargement des parametres...</p>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Nom du chatbot</label>
              <input
                type="text"
                value={settings.chatbot_name}
                onChange={(e) => updateField("chatbot_name", e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                placeholder="Assistant Boutique"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Ton de la marque</label>
              <select
                value={settings.brand_tone}
                onChange={(e) => updateField("brand_tone", e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm"
              >
                {BRAND_TONES.map((tone) => (
                  <option key={tone} value={tone}>{tone}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Langue principale</label>
              <select
                value={settings.primary_language}
                onChange={(e) => updateField("primary_language", e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>{lang.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.allow_emojis}
                  onChange={(e) => updateField("allow_emojis", e.target.checked)}
                  className="accent-brand-600"
                />
                <span className="font-medium">Autoriser les emojis</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Message de bienvenue</label>
              <textarea
                value={settings.greeting_message}
                onChange={(e) => updateField("greeting_message", e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-none"
                rows={2}
                placeholder="Bonjour ! Comment puis-je vous aider ?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Seuil de similarite : {settings.similarity_threshold}
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.similarity_threshold}
                onChange={(e) => updateField("similarity_threshold", parseFloat(e.target.value))}
                className="w-full accent-brand-600"
              />
              <div className="flex justify-between text-xs text-text-secondary mt-0.5">
                <span>0 (permissif)</span>
                <span>1 (strict)</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Nombre max de documents contextuels
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={settings.max_chunks}
                onChange={(e) => updateField("max_chunks", parseInt(e.target.value) || 1)}
                className="w-24 px-3 py-2 border border-border rounded-lg text-sm"
              />
              <p className="text-xs text-text-secondary mt-1">
                Nombre de fragments de connaissance utilises pour chaque reponse.
              </p>
            </div>
          </>
        )}
      </section>

      {/* ============ BASE DE CONNAISSANCES ============ */}
      <section className="bg-white rounded-xl border border-border p-6 space-y-4">
        <h2 className="font-semibold"> Base de connaissances</h2>
        <p className="text-sm text-text-secondary">
          Telechargez vos documents (FAQ, CGV, politique) pour enrichir les reponses.
        </p>
        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
          <p className="text-sm text-text-secondary">
            Glissez-deposez vos fichiers ici, ou <button className="text-brand-600 hover:underline">parcourez</button>
          </p>
          <p className="text-xs text-text-secondary mt-1">PDF, TXT, MD - 10 MB max</p>
        </div>
      </section>

      {/* ============ SAVE + FEEDBACK ============ */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || settingsLoading}
          className="bg-brand-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
        >
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>

        {feedback && (
          <span
            className={`text-sm font-medium ${
              feedback.type === "success" ? "text-green-600" : "text-red-600"
            }`}
          >
            {feedback.type === "success" ? "✓ " : "✕ "}
            {feedback.message}
          </span>
        )}
      </div>

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
        message: data.message || (res.ok ? "Connecte !" : "Erreur inconnue"),
      });
      if (res.ok) setTimeout(onSaved, 1500);
    } catch {
      setResult({ ok: false, message: "Erreur reseau - verifiez que le serveur tourne" });
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
            Entrez votre cle API {provider.label}. Vos cles sont chiffrees et jamais partagees.
          </p>

          <div>
            <label className="block text-sm font-medium mb-1.5">Cle API</label>
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
            <label className="block text-sm font-medium mb-1.5">Modele par defaut</label>
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
              <label>Priorite :</label>
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
              {saving ? "Connexion..." : existingConfig ? "Mettre a jour" : "Connecter"}
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
