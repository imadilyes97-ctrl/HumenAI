"use client";

import { useState, useEffect } from "react";

// ============================================================
// Types
// ============================================================
interface ChannelInfo {
  type: string;
  name: string;
  icon: string;
  description: string;
  fields: ChannelField[];
}

interface ChannelField {
  name: string;
  label: string;
  type: "text" | "password" | "url";
  placeholder: string;
  helpText?: string;
}

interface SavedChannel {
  id: string;
  type: string;
  name: string;
  status: "connected" | "error" | "disconnected";
  error?: string;
}

const CHANNEL_TYPES: ChannelInfo[] = [
  {
    type: "whatsapp",
    name: "WhatsApp Business",
    icon: "📱",
    description: "Connectez votre numéro WhatsApp Business API. Vous avez besoin d'un compte Meta Business et d'un numéro WhatsApp Business.",
    fields: [
      {
        name: "phoneNumberId",
        label: "Phone Number ID",
        type: "text",
        placeholder: "123456789012345",
        helpText: "Trouvable dans Meta Business Suite > WhatsApp > API Setup",
      },
      {
        name: "apiKey",
        label: "Token d'accès permanent",
        type: "password",
        placeholder: "EAAx...",
        helpText: "Token permanent généré dans Meta Business Suite. Commence par 'EAA'.",
      },
      {
        name: "verifyToken",
        label: "Verify Token (webhook)",
        type: "password",
        placeholder: "mon_token_secret_ici",
        helpText: "Token personnalisé pour vérifier les webhooks. Choisissez une chaîne secrète.",
      },
    ],
  },
  {
    type: "instagram",
    name: "Instagram DM",
    icon: "📸",
    description: "Connectez votre compte Instagram professionnel. Nécessite un compte Meta Business lié à Instagram.",
    fields: [
      {
        name: "pageId",
        label: "Facebook Page ID",
        type: "text",
        placeholder: "123456789012345",
        helpText: "ID de la Page Facebook liée à votre compte Instagram",
      },
      {
        name: "instagramId",
        label: "Instagram Business Account ID",
        type: "text",
        placeholder: "17841400000000000",
        helpText: "ID du compte Instagram Business. Trouvable dans Meta Business Suite.",
      },
      {
        name: "accessToken",
        label: "Facebook Access Token",
        type: "password",
        placeholder: "EAAx...",
        helpText: "Token d'accès Facebook (Page Access Token). Commence par 'EAA'.",
      },
    ],
  },
  {
    type: "messenger",
    name: "Facebook Messenger",
    icon: "💬",
    description: "Connectez votre Page Facebook Messenger. Les visiteurs pourront vous écrire depuis votre Page Facebook.",
    fields: [
      {
        name: "pageId",
        label: "Facebook Page ID",
        type: "text",
        placeholder: "123456789012345",
        helpText: "ID de votre Page Facebook",
      },
      {
        name: "accessToken",
        label: "Facebook Page Access Token",
        type: "password",
        placeholder: "EAAx...",
        helpText: "Token d'accès de votre Page Facebook. Commence par 'EAA'.",
      },
      {
        name: "appSecret",
        label: "App Secret (Meta)",
        type: "password",
        placeholder: "abc123...",
        helpText: "Secret de votre app Meta Developer. Utilisé pour vérifier les webhooks.",
      },
    ],
  },
  {
    type: "tiktok",
    name: "TikTok DM",
    icon: "🎵",
    description: "Connectez votre compte TikTok Business. Vous avez besoin d'une app TikTok Developer.",
    fields: [
      {
        name: "appId",
        label: "TikTok App ID",
        type: "text",
        placeholder: "1234567890123456789",
        helpText: "App ID depuis TikTok Developer Portal",
      },
      {
        name: "accessToken",
        label: "TikTok Access Token",
        type: "password",
        placeholder: "tt...",
        helpText: "Access Token de votre app TikTok Business",
      },
      {
        name: "appSecret",
        label: "Client Secret",
        type: "password",
        placeholder: "abc...",
        helpText: "Client Secret depuis TikTok Developer Portal",
      },
    ],
  },
  {
    type: "shopify",
    name: "Shopify",
    icon: "🛍️",
    description: "Connectez votre boutique Shopify. Le chatbot pourra vérifier les stocks, suivre les commandes et générer des liens de paiement.",
    fields: [
      {
        name: "shopDomain",
        label: "Nom de boutique (myshopify.com)",
        type: "text",
        placeholder: "maboutique.myshopify.com",
        helpText: "Le domaine .myshopify.com de votre boutique",
      },
      {
        name: "accessToken",
        label: "Admin API Access Token",
        type: "password",
        placeholder: "shpat_...",
        helpText: "Token d'API Admin depuis Shopify Admin > Apps > Admin API",
      },
      {
        name: "apiVersion",
        label: "Version API",
        type: "text",
        placeholder: "2024-07",
        helpText: "Version API Shopify (ex: 2024-07, 2024-10)",
      },
    ],
  },
  {
    type: "woocommerce",
    name: "WooCommerce",
    icon: "🔗",
    description: "Connectez votre boutique WooCommerce. Le chatbot accédera à votre catalogue et vos commandes.",
    fields: [
      {
        name: "siteUrl",
        label: "URL du site",
        type: "url",
        placeholder: "https://maboutique.com",
        helpText: "URL complète de votre site WooCommerce",
      },
      {
        name: "consumerKey",
        label: "Consumer Key",
        type: "password",
        placeholder: "ck_...",
        helpText: "Clé API depuis WooCommerce > Réglages > Avancé > API REST",
      },
      {
        name: "consumerSecret",
        label: "Consumer Secret",
        type: "password",
        placeholder: "cs_...",
        helpText: "Secret API correspondant à votre Consumer Key",
      },
    ],
  },
];

// ============================================================
// Main Page Component
// ============================================================
export default function IntegrationsPage() {
  const [savedChannels, setSavedChannels] = useState<SavedChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [tenantSlug, setTenantSlug] = useState<string>("demo");
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  // Charger les canaux sauvegardés
  useEffect(() => {
    loadChannels();
    fetch("/api/tenants").then(r => r.ok && r.json()).then(d => {
      if (d?.slug) setTenantSlug(d.slug);
    }).catch(() => {});
  }, []);

  const scriptCode = `<script src="https://humen-ai-pi.vercel.app/widget.js" data-tenant="${tenantSlug}"><\/script>`;

  async function loadChannels() {
    setLoading(true);
    try {
      const res = await fetch("/api/channels");
      if (res.ok) {
        const data = await res.json();
        setSavedChannels(data.channels || []);
      }
    } catch {
      // Silently fail — pas de serveur en dev sans npm install
    } finally {
      setLoading(false);
    }
  }

  function getStatus(type: string): SavedChannel | undefined {
    return savedChannels.find((c) => c.type === type);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Intégrations</h1>
        <p className="text-sm text-text-secondary mt-1">
          Connectez vos canaux de vente et de communication.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-text-secondary">
          Chargement des intégrations...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CHANNEL_TYPES.map((ch) => {
            const saved = getStatus(ch.type);
            return (
              <div
                key={ch.type}
                className="bg-white rounded-xl border border-border p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{ch.icon}</span>
                    <div>
                      <p className="font-medium text-sm">{ch.name}</p>
                      <StatusBadge status={saved?.status || "disconnected"} error={saved?.error} />
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveModal(ch.type)}
                    className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-all ${
                      saved?.status === "connected"
                        ? "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                        : "bg-brand-600 text-white hover:bg-brand-700"
                    }`}
                  >
                    {saved?.status === "connected" ? "Configurer" : "Connecter"}
                  </button>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {ch.description}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Section Widget Web */}
      <div className="bg-white rounded-xl border border-border p-6 space-y-4">
        <div>
          <h3 className="font-semibold">🌐 Widget de chat web</h3>
        <p className="text-sm text-text-secondary mt-1">
            Ajoutez ce script avant la fermeture du <code className="text-brand-600 bg-brand-50 px-1 rounded">&lt;/body&gt;</code> de votre site.
            Le widget apparaîtra en bas à droite.
          </p>
        </div>

        {/* Preview */}
        <div className="border border-border rounded-xl p-4 bg-gradient-to-br from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-brand-600 text-white flex items-center justify-center text-xl shadow-lg">💬</div>
            <div>
              <p className="text-sm font-medium">Assistant HumenAI</p>
              <p className="text-xs text-text-secondary">Visible sur votre site</p>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <div className="bg-brand-50 text-brand-700 text-xs px-3 py-2 rounded-2xl rounded-br-md max-w-[75%]">Bonjour ! Comment puis-je vous aider ?</div>
          </div>
        </div>

        {/* Embed code */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Code à intégrer</label>
            <button
              onClick={() => {
                navigator.clipboard.writeText(scriptCode);
                setCopiedEmbed(true);
                setTimeout(() => setCopiedEmbed(false), 2000);
              }}
              className="text-xs text-brand-600 hover:text-brand-700 font-medium"
            >
              {copiedEmbed ? "✓ Copié !" : "📋 Copier"}
            </button>
          </div>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">{scriptCode}</pre>
        </div>
      </div>

      {/* Modale de connexion */}
      {activeModal && (
        <ChannelModal
          channel={CHANNEL_TYPES.find((c) => c.type === activeModal)!}
          saved={getStatus(activeModal)}
          tenantSlug={tenantSlug}
          onClose={() => setActiveModal(null)}
          onSaved={() => {
            setActiveModal(null);
            loadChannels();
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// Status Badge
// ============================================================
function StatusBadge({ status, error }: { status: string; error?: string }) {
  const styles: Record<string, string> = {
    connected: "bg-green-50 text-green-700",
    error: "bg-red-50 text-red-700",
    disconnected: "bg-gray-50 text-gray-500",
    connecting: "bg-yellow-50 text-yellow-700",
  };

  const labels: Record<string, string> = {
    connected: "Connecté",
    error: `Erreur${error ? ` : ${error.slice(0, 30)}` : ""}`,
    disconnected: "Non connecté",
    connecting: "Connexion...",
  };

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] || styles.disconnected}`}>
      {labels[status] || status}
    </span>
  );
}

// ============================================================
// Modal de connexion par canal
// ============================================================
function ChannelModal({
  channel,
  saved,
  tenantSlug,
  onClose,
  onSaved,
}: {
  channel: ChannelInfo;
  saved?: SavedChannel;
  tenantSlug: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [savedVerifyToken, setSavedVerifyToken] = useState<string | null>(null);

  const webhookUrl = `https://humen-ai-pi.vercel.app/api/webhooks/${channel.type}/${tenantSlug}`;
  const [copied, setCopied] = useState(""); // "" | "url" | "token"

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  }

  const isMetaChannel = ["whatsapp", "instagram", "messenger"].includes(channel.type);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setResult(null);

    try {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: channel.type,
          credentials: form,
        }),
      });

      const data = await res.json();
      // Sauvegarder le verifyToken auto-généré pour l'afficher
      if (data.verifyToken) {
        setSavedVerifyToken(data.verifyToken);
      }
      setResult({
        ok: res.ok && data.channel?.status === "connected",
        message: data.message || (res.ok ? "Connecté !" : "Erreur inconnue"),
      });

      // Ne ferme pas auto si un verifyToken a été généré (l'utilisateur doit le copier)
      if (res.ok && data.channel?.status === "connected" && !data.verifyToken) {
        setTimeout(onSaved, 1500);
      }
    } catch {
      setResult({
        ok: false,
        message: "Erreur réseau — vérifiez que le serveur est lancé (npm run dev)",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{channel.icon}</span>
            <div>
              <h2 className="text-lg font-bold">{channel.name}</h2>
              {saved?.status === "connected" && (
                <p className="text-xs text-green-600">✅ Connecté</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-secondary text-text-secondary"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleConnect} className="p-6 space-y-5">
          <p className="text-sm text-text-secondary">{channel.description}</p>

          {isMetaChannel && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
              <h4 className="text-sm font-semibold text-blue-800">🌐 URL du Webhook</h4>
              <p className="text-xs text-blue-700">
                Copiez cette URL dans <strong>Meta Developer Portal &gt; Webhooks</strong> :
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white border border-blue-200 rounded-lg px-3 py-2 text-xs font-mono text-blue-900 break-all">
                  {webhookUrl}
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(webhookUrl, "url")}
                  className="shrink-0 bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                >
                  {copied === "url" ? "Copié !" : "Copier"}
                </button>
              </div>

              {/* Verify Token — affiché après sauvegarde ou si déjà présent */}
              {(savedVerifyToken || form.verifyToken) && (
                <div>
                  <p className="text-xs font-semibold text-blue-800 mt-2 mb-1">🔑 Verify Token</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white border border-blue-200 rounded-lg px-3 py-2 text-xs font-mono text-blue-900 break-all">
                      {savedVerifyToken || form.verifyToken}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(savedVerifyToken || form.verifyToken || "", "token")}
                      className="shrink-0 bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                    >
                      {copied === "token" ? "Copié !" : "Copier"}
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-white border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                <p className="font-medium mb-1">📋 Étapes pour connecter :</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Créez une app Meta Developer</li>
                  <li>Ajoutez le produit {channel.name} API</li>
                  <li>Dans Webhooks, collez l&apos;URL ci-dessus</li>
                  {savedVerifyToken ? (
                    <li>Collez le <strong>Verify Token</strong> juste au-dessus (auto-généré)</li>
                  ) : (
                    <li>Entrez le <strong>Verify Token</strong> que vous choisissez (champ ci-dessous)</li>
                  )}
                  <li>Meta enverra une requête de vérification</li>
                  <li>Une fois vérifié, vous recevrez les messages ici</li>
                </ol>
              </div>
            </div>
          )}

          {channel.fields.map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-medium mb-1.5" htmlFor={field.name}>
                {field.label}
              </label>
              <input
                id={field.name}
                type={field.type}
                value={form[field.name] || ""}
                onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
                placeholder={field.placeholder}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow"
                required
              />
              {field.helpText && (
                <p className="text-xs text-text-secondary mt-1">{field.helpText}</p>
              )}
            </div>
          ))}

          {/* Résultat */}
          {result && (
            <div
              className={`p-3 rounded-xl text-sm ${
                result.ok
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {result.message}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-brand-600 text-white py-2.5 rounded-xl font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              {saving ? "Connexion en cours..." : "Connecter"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-surface-secondary transition-colors"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
