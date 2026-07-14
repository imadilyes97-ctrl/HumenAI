"use client";

import { useState, useEffect, useRef } from "react";

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
  id: string; provider: ProviderName; label: string; apiKey: string;
  models: string[]; capabilities: string[]; defaultModel: string; isActive: boolean; priority: number;
}

const TONES_UI_TO_DB: Record<string, string> = {
  "Professionnel": "professional", "Amical": "friendly",
  "Humoristique": "humorous", "Direct": "direct",
};
const TONES_DB_TO_UI: Record<string, string> = {
  "professional": "Professionnel", "friendly": "Amical",
  "humorous": "Humoristique", "direct": "Direct",
};

const LANGUAGES = [
  { value: "fr", label: "Français" }, { value: "en", label: "English" },
  { value: "es", label: "Español" }, { value: "de", label: "Deutsch" },
  { value: "it", label: "Italiano" }, { value: "pt", label: "Português" },
  { value: "nl", label: "Nederlands" }, { value: "ar", label: "العربية" },
];
const RESPONSE_LENGTHS = [
  { value: "short", label: "Courte (1 phrase)" },
  { value: "medium", label: "Moyenne (2-3 phrases)" },
  { value: "long", label: "Longue (détaillée)" },
];

interface TenantSettings {
  chatbot_name: string; brand_tone: string; company_mission: string;
  language_rules: string; primary_language: string; supported_languages: string[];
  fallback_language: string; allow_emojis: boolean; preferred_response_length: string;
  greeting_message: string; fallback_message: string; business_hours_enabled: boolean;
  business_hours_timezone: string; similarity_threshold: number; max_chunks: number;
  ai_model: string; ai_temperature: number;
}

interface BehaviorConfig {
  prankMode: boolean; prankLevel: string; prankVictim: string; prankLimitPerSession: number;
  checkoutMode: string; requireEmail: boolean; requirePhone: boolean; requireAddress: boolean;
  humorLevel: number; persuasionLevel: number; formalityLevel: number;
  creativityLevel: number; empathyLevel: number; proactiveness: number;
  arabicDialectPreference: string; abbreviationHandling: boolean;
  _legacyRules?: string;
}

const DEFAULT_BEHAVIOR: BehaviorConfig = {
  prankMode: false, prankLevel: "none", prankVictim: "", prankLimitPerSession: 0,
  checkoutMode: "full_checkout", requireEmail: true, requirePhone: false, requireAddress: false,
  humorLevel: 0.5, persuasionLevel: 0.7, formalityLevel: 0.3, creativityLevel: 0.5,
  empathyLevel: 0.7, proactiveness: 0.7, arabicDialectPreference: "darija", abbreviationHandling: true,
};

const DEFAULT_SETTINGS: TenantSettings = {
  chatbot_name: "Assistant", brand_tone: "friendly", company_mission: "",
  language_rules: "", primary_language: "fr", supported_languages: ["fr"],
  fallback_language: "fr", allow_emojis: true, preferred_response_length: "medium",
  greeting_message: "Bonjour ! Je suis votre assistant.",
  fallback_message: "Je suis désolé, je ne peux pas répondre à cette question pour le moment.",
  business_hours_enabled: false, business_hours_timezone: "Africa/Algiers",
  similarity_threshold: 0.75, max_chunks: 5, ai_model: "deepseek-v4-flash-free", ai_temperature: 0.3,
};

function parseBehavior(raw: string | null | undefined): BehaviorConfig {
  if (!raw) return { ...DEFAULT_BEHAVIOR };
  try { return { ...DEFAULT_BEHAVIOR, ...JSON.parse(raw) }; }
  catch { return { ...DEFAULT_BEHAVIOR, _legacyRules: raw }; }
}

export default function SettingsPage() {
  const [configs, setConfigs] = useState<ProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<ProviderName | null>(null);

  const [settings, setSettings] = useState<TenantSettings>(DEFAULT_SETTINGS);
  const [behavior, setBehavior] = useState<BehaviorConfig>(DEFAULT_BEHAVIOR);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => { loadProviders(); loadSettings(); }, []);

  async function loadProviders() {
    try {
      const res = await fetch("/api/models");
      if (res.ok) { const data = await res.json(); setConfigs(data.providers || []); }
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
            chatbot_name: data.chatbot_name ?? DEFAULT_SETTINGS.chatbot_name,
            brand_tone: data.brand_tone ?? DEFAULT_SETTINGS.brand_tone,
            company_mission: data.company_mission ?? "",
            language_rules: data.language_rules ?? "",
            primary_language: data.primary_language ?? "fr",
            supported_languages: data.supported_languages ?? ["fr"],
            fallback_language: data.fallback_language ?? "fr",
            allow_emojis: data.allow_emojis !== false,
            preferred_response_length: data.preferred_response_length ?? "medium",
            greeting_message: data.greeting_message ?? DEFAULT_SETTINGS.greeting_message,
            fallback_message: data.fallback_message ?? DEFAULT_SETTINGS.fallback_message,
            business_hours_enabled: data.business_hours_enabled ?? false,
            business_hours_timezone: data.business_hours_timezone ?? "Africa/Algiers",
            similarity_threshold: data.similarity_threshold ?? 0.75,
            max_chunks: data.max_chunks ?? 5,
            ai_model: data.ai_model ?? "deepseek-v4-flash-free",
            ai_temperature: data.ai_temperature ?? 0.3,
          });
          setBehavior(parseBehavior(data.language_rules));
        }
      }
    } catch { /* silent */ }
    finally { setSettingsLoading(false); }
  }

  function updateField<K extends keyof TenantSettings>(key: K, value: TenantSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function updateBehavior<K extends keyof BehaviorConfig>(key: K, value: BehaviorConfig[K]) {
    setBehavior((prev) => ({ ...prev, [key]: value }));
  }

  function serializeBehaviorConfig(): string {
    const { _legacyRules: _, ...clean } = behavior;
    return JSON.stringify(clean);
  }

  async function handleSave() {
    setSaving(true); setFeedback(null);
    const body = {
      chatbot_name: settings.chatbot_name,
      brand_tone: settings.brand_tone,
      company_mission: settings.company_mission,
      language_rules: serializeBehaviorConfig(),
      primary_language: settings.primary_language,
      supported_languages: settings.supported_languages,
      fallback_language: settings.fallback_language,
      allow_emojis: settings.allow_emojis,
      preferred_response_length: settings.preferred_response_length,
      greeting_message: settings.greeting_message,
      fallback_message: settings.fallback_message,
      business_hours_enabled: settings.business_hours_enabled,
      business_hours_timezone: settings.business_hours_timezone,
      similarity_threshold: settings.similarity_threshold,
      max_chunks: settings.max_chunks,
      ai_model: settings.ai_model,
      ai_temperature: settings.ai_temperature,
    };
    try {
      const res = await fetch("/api/tenants/settings", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (res.ok) setFeedback({ type: "success", message: "✅ Paramètres enregistrés — le chatbot utilise maintenant cette configuration" });
      else { const d = await res.json(); setFeedback({ type: "error", message: d.error || "Erreur" }); }
    } catch { setFeedback({ type: "error", message: "Erreur réseau" }); }
    finally { setSaving(false); setTimeout(() => setFeedback(null), 5000); }
  }

  function getProviderConfig(provider: ProviderName): ProviderConfig | undefined {
    return configs.find((c) => c.provider === provider);
  }

  const S = (lbl: string, desc: string) => (
    <><label className="block text-sm font-medium mb-1">{lbl}</label><p className="text-xs text-text-secondary mb-1.5">{desc}</p></>
  );

  return (
    <div className="max-w-3xl space-y-6 pb-12">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configuration</h1>
          <p className="text-sm text-text-secondary mt-1">
            Contrôle total sur l&apos;identité, le comportement et les modèles IA de votre chatbot.
          </p>
        </div>
      </div>

      {/* 🌟 MODE PRANK */}
      <section className={`rounded-xl border p-6 space-y-4 transition-all ${behavior.prankMode ? "bg-gradient-to-br from-purple-50 to-pink-50 border-purple-300" : "bg-white border-border"}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-lg flex items-center gap-2">
              {behavior.prankMode ? "🎭" : "🎭"} Mode Prank
            </h2>
            <p className="text-sm text-text-secondary">Active les blagues, défis et taquineries du chatbot avec les clients</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={behavior.prankMode}
              onChange={(e) => updateBehavior("prankMode", e.target.checked)}
              className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>

        {behavior.prankMode && (
          <div className="space-y-4 pl-0">
            <div>
              <label className="block text-sm font-medium mb-1">Intensité des pranks</label>
              <div className="flex gap-2">
                {[
                  { key: "light", label: "🌱 Léger", desc: "Blagues simples, taquineries" },
                  { key: "medium", label: "🔥 Modéré", desc: "Défis, mystères" },
                  { key: "heavy", label: "💥 Explosif", desc: "Pranks élaborés, scenarios" },
                ].map((o) => (
                  <button key={o.key} onClick={() => updateBehavior("prankLevel", o.key)}
                    className={`flex-1 p-3 rounded-xl border text-sm text-left transition-all ${
                      behavior.prankLevel === o.key
                        ? "border-purple-500 bg-purple-50 ring-1 ring-purple-500"
                        : "border-border hover:border-purple-300"
                    }`}>
                    <p className="font-medium">{o.label}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{o.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Cible spécifique (optionnel)</label>
                <input type="text" value={behavior.prankVictim}
                  onChange={(e) => updateBehavior("prankVictim", e.target.value)}
                  placeholder="ex: Ilyes, ou laisser vide pour tout le monde"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
              </div>
              <div className="w-32">
                <label className="block text-sm font-medium mb-1">Max par session</label>
                <input type="number" min={0} max={20} value={behavior.prankLimitPerSession}
                  onChange={(e) => updateBehavior("prankLimitPerSession", parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm text-center" />
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              ⚠️ Le chatbot reste bienveillant : si le client semble agacé, il arrête immédiatement
            </div>
          </div>
        )}
      </section>

      {/* 🛒 MODE CHECKOUT */}
      <section className="bg-white rounded-xl border border-border p-6 space-y-4">
        <h2 className="font-semibold text-lg">🛒 Mode de vente</h2>
        <div className="flex gap-3">
          {[
            { key: "simple_form", label: "📋 Formulaire simple", desc: "Juste le minimum (nom + email)", icon: "📝" },
            { key: "full_checkout", label: "🛍️ Checkout complet", desc: "Guide vers l'achat complet (adresse, téléphone, etc.)", icon: "🛒" },
          ].map((o) => (
            <button key={o.key} onClick={() => updateBehavior("checkoutMode", o.key)}
              className={`flex-1 p-4 rounded-xl border text-left transition-all ${
                behavior.checkoutMode === o.key
                  ? "border-brand-600 bg-brand-50 ring-1 ring-brand-500"
                  : "border-border hover:border-brand-300"
              }`}>
              <p className="text-xl mb-1">{o.icon}</p>
              <p className="font-medium text-sm">{o.label}</p>
              <p className="text-xs text-text-secondary mt-1">{o.desc}</p>
            </button>
          ))}
        </div>
        {behavior.checkoutMode === "full_checkout" && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-text-secondary uppercase">Champs obligatoires</p>
            <div className="flex flex-wrap gap-3">
              {[
                { key: "requireEmail" as const, label: "📧 Email" },
                { key: "requirePhone" as const, label: "📞 Téléphone" },
                { key: "requireAddress" as const, label: "📍 Adresse" },
              ].map((o) => (
                <label key={o.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={behavior[o.key]}
                    onChange={(e) => updateBehavior(o.key, e.target.checked)}
                    className="accent-brand-600" />
                  {o.label}
                </label>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 🎯 PERSONNALITÉ FINE */}
      <section className="bg-white rounded-xl border border-border p-6 space-y-5">
        <h2 className="font-semibold text-lg">🎯 Personnalité fine</h2>
        <p className="text-sm text-text-secondary -mt-3">Règle chaque aspect de la personnalité de votre chatbot</p>

        {/* Humour */}
        <SliderControl label="😂 Humour" value={behavior.humorLevel}
          onChange={(v) => updateBehavior("humorLevel", v)}
          left="Sérieux" right="Très drôle" desc="De strict à hilarant" />

        {/* Persuasion */}
        <SliderControl label="💼 Persuasion commerciale" value={behavior.persuasionLevel}
          onChange={(v) => updateBehavior("persuasionLevel", v)}
          left="Informatif" right="Très persuasif" desc="Force de vente et arguments" />

        {/* Formalité */}
        <SliderControl label="👔 Formalité" value={behavior.formalityLevel}
          onChange={(v) => updateBehavior("formalityLevel", v)}
          left="Décontracté" right="Très formel" desc="Tutoiement / vouvoiement" />

        {/* Créativité */}
        <SliderControl label="🎨 Créativité" value={behavior.creativityLevel}
          onChange={(v) => updateBehavior("creativityLevel", v)}
          left="Prévisible" right="Surprenant" desc="Liberté créative du chatbot" />

        {/* Empathie */}
        <SliderControl label="💚 Empathie" value={behavior.empathyLevel}
          onChange={(v) => updateBehavior("empathyLevel", v)}
          left="Neutre" right="Très chaleureux" desc="Connexion émotionnelle avec le client" />

        {/* Proactivité */}
        <SliderControl label="⚡ Proactivité" value={behavior.proactiveness}
          onChange={(v) => updateBehavior("proactiveness", v)}
          left="Réactif" right="Très proactif" desc="Proposer vs attendre" />

        {/* Température (mappée sur créativité) */}
        <div className="pt-2 border-t border-border">
          <SliderControl label="🌡️ Température IA" value={settings.ai_temperature}
            onChange={(v) => updateField("ai_temperature", v)}
            left="Précis (0)" right="Créatif (1)" desc="Plus c'est haut, plus l'IA est créative" />
        </div>
      </section>

      {/* 🌍 LANGUES & DIALECTES */}
      <section className="bg-white rounded-xl border border-border p-6 space-y-4">
        <h2 className="font-semibold text-lg">🌍 Langues & Dialectes</h2>

        {!settingsLoading && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Langue principale</label>
                <select value={settings.primary_language}
                  onChange={(e) => updateField("primary_language", e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm">
                  {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Langue de repli</label>
                <select value={settings.fallback_language}
                  onChange={(e) => updateField("fallback_language", e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm">
                  {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Préférence arabe</label>
              <p className="text-xs text-text-secondary mb-1.5">Quand le client parle arabe, quel dialecte utiliser ?</p>
              <div className="flex gap-2">
                {[
                  { key: "darija", label: "🇩🇿 Darija algérienne", desc: "Dialecte algérien parlé" },
                  { key: "fusha", label: "🇸🇦 Arabe standard (Fusha)", desc: "Arabe littéraire formel" },
                  { key: "any", label: "🔄 Suivre le client", desc: "Adapter au dialecte du client" },
                ].map((o) => (
                  <button key={o.key} onClick={() => updateBehavior("arabicDialectPreference", o.key)}
                    className={`flex-1 p-3 rounded-xl border text-sm text-left transition-all ${
                      behavior.arabicDialectPreference === o.key
                        ? "border-brand-600 bg-brand-50 ring-1 ring-brand-500"
                        : "border-border hover:border-brand-300"
                    }`}>
                    <p className="font-medium">{o.label}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{o.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={behavior.abbreviationHandling}
                  onChange={(e) => updateBehavior("abbreviationHandling", e.target.checked)}
                  className="accent-brand-600" />
                <span className="font-medium">Comprendre les abréviations</span>
              </label>
              <span className="text-xs text-text-secondary">(cv, tfq, pk, mdr, stp, etc.)</span>
            </div>
          </>
        )}
      </section>

      {/* 🧑‍💼 IDENTITÉ */}
      <section className="bg-white rounded-xl border border-border p-6 space-y-4">
        <h2 className="font-semibold text-lg">🧑‍💼 Identité</h2>
        {settingsLoading ? (
          <p className="text-sm text-text-secondary">Chargement...</p>
        ) : (
          <>
            <div>
              {S("Nom du chatbot", "Comment le client voit votre assistant")}
              <input type="text" value={settings.chatbot_name}
                onChange={(e) => updateField("chatbot_name", e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm" placeholder="Assistant Boutique" />
            </div>
            <div>
              {S("Ton de la marque", "Style de communication principal")}
              <select value={TONES_DB_TO_UI[settings.brand_tone] || settings.brand_tone}
                onChange={(e) => updateField("brand_tone", TONES_UI_TO_DB[e.target.value] || e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm">
                {Object.entries(TONES_UI_TO_DB).map(([label, val]) => (
                  <option key={val} value={label}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              {S("Mission de l'entreprise", "Le chatbot connaît votre mission et s'en inspire")}
              <textarea value={settings.company_mission}
                onChange={(e) => updateField("company_mission", e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-none" rows={2}
                placeholder="Nous vendons des produits de beauté naturels, fabriqués en Algérie..." />
            </div>
          </>
        )}
      </section>

      {/* 🤖 MODÈLES IA */}
      <section className="bg-white rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-lg">🤖 Modèles IA</h2>
            <p className="text-sm text-text-secondary">Connectez vos clés API. Routage automatique texte/image/vocal.</p>
          </div>
        </div>
        <div className="bg-brand-50 border border-brand-200 rounded-lg p-3 mb-4 text-sm text-brand-800">
          <strong>⚡ Routage automatique :</strong> Texte → priorité 1 · Image → modèle vision · Audio → modèle audio · Fallback automatique
        </div>
        {loading ? (
          <p className="text-sm text-text-secondary">Chargement...</p>
        ) : (
          <div className="space-y-3">
            {PROVIDERS.map((p) => {
              const config = getProviderConfig(p.id);
              const connected = config?.isActive || false;
              const caps = config?.capabilities || [];
              const capLabels: Record<string, string> = { text: "📝 Texte", vision: "🖼️ Image", audio: "🎤 Vocal" };
              return (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-surface-secondary transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{p.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{p.label}</p>
                        {connected && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">Connecté</span>}
                      </div>
                      {caps.length > 0 && (
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                          {caps.map((cap) => (
                            <span key={cap} className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-text-secondary">{capLabels[cap] || cap}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setActiveModal(p.id)}
                    className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
                      connected ? "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200" : "bg-brand-600 text-white hover:bg-brand-700"
                    }`}>
                    {connected ? "Modifier" : "Connecter"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 💬 COMPORTEMENT RÉPONSES */}
      <section className="bg-white rounded-xl border border-border p-6 space-y-4">
        <h2 className="font-semibold text-lg">💬 Réponses</h2>
        {!settingsLoading && (
          <>
            <div>
              {S("Message de bienvenue", "Premier message quand un client démarre")}
              <textarea value={settings.greeting_message}
                onChange={(e) => updateField("greeting_message", e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-none" rows={2}
                placeholder="Bonjour ! Je suis votre assistant. Comment puis-je vous aider ?" />
            </div>
            <div>
              {S("Message de repli", "Quand le chatbot ne sait pas répondre")}
              <textarea value={settings.fallback_message}
                onChange={(e) => updateField("fallback_message", e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-none" rows={2}
                placeholder="Je suis désolé, je ne peux pas répondre..." />
            </div>
            <div>
              {S("Longueur des réponses", "Préfères-tu des réponses courtes ou détaillées ?")}
              <select value={settings.preferred_response_length}
                onChange={(e) => updateField("preferred_response_length", e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm">
                {RESPONSE_LENGTHS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={settings.allow_emojis}
                  onChange={(e) => updateField("allow_emojis", e.target.checked)}
                  className="accent-brand-600" />
                <span className="font-medium">Autoriser les émojis</span>
              </label>
            </div>
          </>
        )}
      </section>

      {/* 🕐 HORAIRES */}
      <section className="bg-white rounded-xl border border-border p-6 space-y-4">
        <h2 className="font-semibold text-lg">🕐 Horaires d&apos;ouverture</h2>
        {!settingsLoading && (
          <>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={settings.business_hours_enabled}
                onChange={(e) => updateField("business_hours_enabled", e.target.checked)}
                className="accent-brand-600" />
              <span className="font-medium">Activer les horaires d&apos;ouverture</span>
            </label>
            {settings.business_hours_enabled && (
              <div>
                <label className="block text-sm font-medium mb-1">Fuseau horaire</label>
                <select value={settings.business_hours_timezone}
                  onChange={(e) => updateField("business_hours_timezone", e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm">
                  <option value="Africa/Algiers">Afrique/Alger (UTC+1)</option>
                  <option value="Africa/Casablanca">Afrique/Casablanca (UTC+0/+1)</option>
                  <option value="Africa/Tunis">Afrique/Tunis (UTC+1)</option>
                  <option value="Europe/Paris">Europe/Paris (UTC+1/+2)</option>
                  <option value="America/New_York">Amérique/New York (UTC-5/-4)</option>
                  <option value="Asia/Dubai">Asie/Dubaï (UTC+4)</option>
                </select>
              </div>
            )}
          </>
        )}
      </section>

      {/* 📚 RAG */}
      <section className="bg-white rounded-xl border border-border p-6 space-y-4">
        <h2 className="font-semibold text-lg">📚 Base de connaissances (RAG)</h2>
        {!settingsLoading && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Seuil de similarité : {settings.similarity_threshold.toFixed(3)}</label>
              <p className="text-xs text-text-secondary mb-1.5">Plus c&apos;est bas, plus le chatbot cherche large</p>
              <input type="range" min={0} max={1} step={0.05} value={settings.similarity_threshold}
                onChange={(e) => updateField("similarity_threshold", parseFloat(e.target.value))}
                className="w-full accent-brand-600" />
              <div className="flex justify-between text-xs text-text-secondary mt-0.5">
                <span>0.5 (permissif)</span><span>1 (strict)</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nombre max de documents</label>
              <div className="flex items-center gap-3">
                <input type="number" min={1} max={20} value={settings.max_chunks}
                  onChange={(e) => updateField("max_chunks", parseInt(e.target.value) || 1)}
                  className="w-24 px-3 py-2 border border-border rounded-lg text-sm" />
                <span className="text-xs text-text-secondary">fragments</span>
              </div>
            </div>
            <KnowledgeBaseSection />
          </>
        )}
      </section>

      {/* SAVE */}
      <div className="flex items-center gap-3 bg-white rounded-xl border border-border p-4">
        <button onClick={handleSave} disabled={saving || settingsLoading}
          className="bg-brand-600 text-white px-8 py-2.5 rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50">
          {saving ? "💾 Enregistrement..." : "💾 Enregistrer les paramètres"}
        </button>
        {feedback && (
          <span className={`text-sm font-medium ${feedback.type === "success" ? "text-green-600" : "text-red-600"}`}>
            {feedback.message}
          </span>
        )}
      </div>

      {/* Provider Modal */}
      {activeModal && (
        <ProviderModal provider={PROVIDERS.find((p) => p.id === activeModal)!} existingConfig={getProviderConfig(activeModal)}
          onClose={() => setActiveModal(null)} onSaved={() => { setActiveModal(null); loadProviders(); }} />
      )}
    </div>
  );
}

// ── Slider Control ──
function SliderControl({ label, value, onChange, left, right, desc }: {
  label: string; value: number; onChange: (v: number) => void; left: string; right: string; desc: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium">{label}</label>
        <span className="text-xs font-mono text-text-secondary bg-gray-50 px-1.5 py-0.5 rounded">
          {value < 0.3 ? "🔵" : value < 0.5 ? "🟢" : value < 0.7 ? "🟡" : "🔴"} {value.toFixed(2)}
        </span>
      </div>
      <p className="text-xs text-text-secondary mb-1.5">{desc}</p>
      <input type="range" min={0} max={1} step={0.05} value={value} onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-brand-600" />
      <div className="flex justify-between text-xs text-text-secondary mt-0.5">
        <span>{left}</span><span>{right}</span>
      </div>
    </div>
  );
}

// ── Provider Modal ──
function ProviderModal({ provider, existingConfig, onClose, onSaved }: {
  provider: typeof PROVIDERS[0]; existingConfig?: ProviderConfig; onClose: () => void; onSaved: () => void;
}) {
  const [apiKey, setApiKey] = useState(existingConfig?.apiKey || "");
  const [selectedModel, setSelectedModel] = useState(existingConfig?.defaultModel || provider.models[0]);
  const [priority, setPriority] = useState(existingConfig?.priority || 1);
  const [caps, setCaps] = useState<string[]>(existingConfig?.capabilities || []);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const CAP_OPTIONS = [
    { key: "text", label: "📝 Texte", desc: "Messages textuels" },
    { key: "vision", label: "🖼️ Image", desc: "Photos, screenshots" },
    { key: "audio", label: "🎤 Vocal", desc: "Messages vocaux, audios" },
  ] as const;

  function toggleCap(key: string) {
    setCaps((prev) => prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]);
  }

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setResult(null);
    try {
      const res = await fetch("/api/models", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: provider.id, apiKey, capabilities: caps, defaultModel: selectedModel, priority }),
      });
      const data = await res.json();
      setResult({ ok: res.ok, message: data.message || (res.ok ? "✅ Connecté !" : "Erreur inconnue") });
      if (res.ok) setTimeout(onSaved, 1500);
    } catch { setResult({ ok: false, message: "Erreur réseau" }); }
    finally { setSaving(false); }
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
          <div>
            <label className="block text-sm font-medium mb-1.5">Clé API</label>
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..." className="w-full px-3 py-2.5 border border-border rounded-xl text-sm font-mono" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Modèle par défaut</label>
            <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm">
              {provider.models.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Capacités activées</label>
            <div className="flex flex-wrap gap-2">
              {CAP_OPTIONS.map((opt) => {
                const selected = caps.includes(opt.key);
                return (
                  <button key={opt.key} type="button" onClick={() => toggleCap(opt.key)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition-all ${
                      selected ? "border-brand-500 bg-brand-50 text-brand-700 font-medium" : "border-border text-text-secondary hover:border-brand-300"
                    }`}>
                    <span className={selected ? "" : "opacity-40"}>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-3">
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

// ── Knowledge Base Section ──
function KnowledgeBaseSection() {
  const [documents, setDocuments] = useState<Array<{ id: string; title: string; chunkCount: number; sourceType: string; processedAt: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [kbFeedback, setKbFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadDocuments(); }, []);

  async function loadDocuments() {
    setLoading(true);
    try { const res = await fetch("/api/knowledge"); if (res.ok) { const d = await res.json(); setDocuments(d.documents || []); } }
    catch { /* silent */ }
    finally { setLoading(false); }
  }

  async function handleUploadFile(file: File) {
    if (file.size > 10 * 1024 * 1024) { setKbFeedback({ type: "error", message: "Fichier trop volumineux (max 10 MB)" }); setTimeout(() => setKbFeedback(null), 4000); return; }
    setUploading(true); setKbFeedback(null);
    try {
      const formData = new FormData(); formData.append("file", file);
      const res = await fetch("/api/knowledge", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) setKbFeedback({ type: "success", message: data.message || "Document importé !" });
      else setKbFeedback({ type: "error", message: data.error || "Erreur" });
      loadDocuments();
    } catch { setKbFeedback({ type: "error", message: "Erreur réseau" }); }
    finally { setUploading(false); setTimeout(() => setKbFeedback(null), 4000); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce document ?")) return;
    try { const res = await fetch(`/api/knowledge?id=${id}`, { method: "DELETE" }); if (res.ok) { setKbFeedback({ type: "success", message: "Supprimé" }); loadDocuments(); } }
    catch { /* silent */ }
  }

  return (
    <div className="space-y-4 pt-4 border-t border-border">
      <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleUploadFile(f); }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${dragOver ? "border-brand-500 bg-brand-50" : "border-border hover:border-brand-300"} ${uploading ? "opacity-50" : ""}`}>
        <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md,.csv,.json,.html" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadFile(f); }} className="hidden" />
        {uploading ? (
          <div className="flex items-center justify-center gap-2"><span className="animate-spin">⏳</span><p className="text-sm text-text-secondary">Import...</p></div>
        ) : (
          <><p className="text-sm text-text-secondary"><span className="text-brand-600 font-medium">Cliquez</span> ou glissez-déposez</p><p className="text-xs text-text-secondary mt-1">PDF, TXT, MD, CSV, JSON — 10 MB max</p></>
        )}
      </div>
      {kbFeedback && (
        <div className={`p-3 rounded-xl text-sm ${kbFeedback.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {kbFeedback.message}
        </div>
      )}
      {loading ? (
        <p className="text-sm text-text-secondary">Chargement...</p>
      ) : documents.length === 0 ? (
        <div className="text-center py-6"><p className="text-3xl mb-2">📄</p><p className="text-sm text-text-secondary">Aucun document</p><p className="text-xs text-text-secondary mt-1">Importez FAQ, CGV ou catalogue.</p></div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-medium text-text-secondary uppercase">{documents.length} document{documents.length > 1 ? "s" : ""}</p>
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-surface-secondary">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-lg shrink-0">📄</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{doc.title}</p>
                  <p className="text-xs text-text-secondary">{doc.chunkCount} chunk{doc.chunkCount > 1 ? "s" : ""} · {new Date(doc.processedAt).toLocaleDateString("fr-FR")}</p>
                </div>
              </div>
              <button onClick={() => handleDelete(doc.id)} className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg shrink-0">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
