import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-brand-600">Humen</span>
            <span className="text-2xl font-light text-text-primary">AI</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/login" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
              Connexion
            </Link>
            <Link
              href="/register"
              className="text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors"
            >
              Essai gratuit
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          <div className="max-w-3xl">
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-text-primary leading-[1.1]">
              Votre assistant IA
              <span className="block text-brand-600">sur tous vos canaux</span>
            </h1>
            <p className="mt-6 text-lg text-text-secondary leading-relaxed max-w-xl">
              HumenAI déploie un agent conversationnel intelligent sur WhatsApp, Instagram, Messenger,
              TikTok et votre boutique en ligne. <strong>Un point de configuration, tous vos canaux.</strong>
            </p>
            <div className="flex items-center gap-4 mt-8">
              <Link
                href="/register"
                className="bg-brand-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-700 transition-colors"
              >
                Déployer mon assistant
              </Link>
              <Link
                href="#features"
                className="text-text-secondary hover:text-text-primary px-6 py-3 rounded-lg font-medium transition-colors"
              >
                En savoir plus
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t border-border py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-16">
              Tout ce qu'il faut pour vendre plus, supporter mieux
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {features.map((f) => (
                <div key={f.title} className="p-6 rounded-xl border border-border bg-white hover:shadow-sm transition-shadow">
                  <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center text-brand-600 text-lg mb-4">
                    {f.icon}
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Channels */}
        <section className="border-t border-border py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-4">Omnicanal natif</h2>
            <p className="text-text-secondary mb-12 max-w-lg mx-auto">
              Un seul assistant, déployé partout où vos clients vous parlent.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              {channels.map((c) => (
                <div
                  key={c.name}
                  className="px-6 py-3 rounded-full border border-border bg-surface text-sm font-medium"
                >
                  {c.name}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-text-secondary">
          &copy; {new Date().getFullYear()} HumenAI. Tous droits réservés.
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: "🤖",
    title: "IA entraînée sur votre marque",
    description:
      "Le chatbot connaît vos produits, votre politique et votre ton. Base de connaissances RAG synchronisée avec votre catalogue.",
  },
  {
    icon: "🔄",
    title: "Hand-off humain fluide",
    description:
      "Quand l'IA ne peut pas répondre, le client bascule vers un agent humain avec tout l'historique de la conversation.",
  },
  {
    icon: "📊",
    title: "Analytics & ROI",
    description:
      "Taux de résolution, satisfaction client, revenus attribués au chatbot. Des données pour piloter votre support.",
  },
  {
    icon: "🔌",
    title: "Actions e-commerce",
    description:
      "Suivi de commande, vérification de stock, génération de lien de paiement, gestion des retours.",
  },
  {
    icon: "🔒",
    title: "Sécurité & conformité",
    description:
      "RGPD, chiffrement de bout en bout, isolation stricte des données marchands. Votre marque privée protégée.",
  },
  {
    icon: "🌐",
    title: "Multilingue automatique",
    description:
      "Détection de la langue du client et réponse dans sa langue. Personnalisable par marché.",
  },
];

const channels = [
  "WhatsApp Business",
  "Instagram DM",
  "Facebook Messenger",
  "TikTok DM",
  "Shopify",
  "WooCommerce",
  "Wix",
  "PrestaShop",
  "Widget Web",
  "Email",
];
