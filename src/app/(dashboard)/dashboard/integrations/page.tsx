"use client";

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Intégrations</h1>
        <p className="text-sm text-text-secondary mt-1">
          Connectez vos canaux de vente et de communication.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {channels.map((ch) => (
          <div
            key={ch.name}
            className="bg-white rounded-xl border border-border p-5 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{ch.icon}</span>
              <div>
                <p className="font-medium text-sm">{ch.name}</p>
                <p className="text-xs text-text-secondary">
                  {ch.connected ? "Connecté" : "Non connecté"}
                </p>
              </div>
            </div>
            <button
              className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${
                ch.connected
                  ? "bg-green-50 text-green-700 hover:bg-green-100"
                  : "bg-brand-600 text-white hover:bg-brand-700"
              }`}
            >
              {ch.connected ? "Configurer" : "Connecter"}
            </button>
          </div>
        ))}
      </div>

      {/* Web Widget */}
      <div className="bg-white rounded-xl border border-border p-6">
        <h3 className="font-semibold mb-2">Widget de chat web</h3>
        <p className="text-sm text-text-secondary mb-4">
          Intégrez le chatbot directement sur votre site. Copiez ce script dans le
          <code className="text-brand-600 bg-brand-50 px-1 rounded">&lt;head&gt;</code> de votre site.
        </p>
        <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto">
{`<script>
  (function(w,d,s,o,f){w.HumenAI=w.HumenAI||function(){(w.HumenAI.q=w.HumenAI.q||[]).push(arguments)};
  w.HumenAI('init', 'VOTRE_CLE_PUBLIQUE');
  s=d.createElement('script');s.async=1;s.src=o;
  d.head.appendChild(s);
})(window,document,'https://widget.humenai.app/widget.js');
</script>`}
        </pre>
      </div>
    </div>
  );
}

const channels = [
  { name: "WhatsApp Business", icon: "📱", connected: false },
  { name: "Instagram DM", icon: "📸", connected: false },
  { name: "Facebook Messenger", icon: "💬", connected: false },
  { name: "TikTok DM", icon: "🎵", connected: false },
  { name: "Shopify", icon: "🛍️", connected: false },
  { name: "WooCommerce", icon: "🔗", connected: false },
  { name: "Wix", icon: "🌐", connected: false },
  { name: "PrestaShop", icon: "📦", connected: false },
  { name: "Email", icon: "✉️", connected: false },
];
