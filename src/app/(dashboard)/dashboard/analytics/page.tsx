"use client";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytiques</h1>
        <p className="text-sm text-text-secondary mt-1">
          Performance de votre assistant IA et satisfaction client.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-border p-6">
          <h3 className="font-semibold mb-4">Taux de résolution</h3>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-brand-600">—</span>
            <span className="text-sm text-text-secondary mb-1">% automatisé</span>
          </div>
          <p className="text-xs text-text-secondary mt-2">
            Pas assez de données. Revenez après quelques conversations.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-border p-6">
          <h3 className="font-semibold mb-4">Satisfaction client</h3>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-green-600">—</span>
            <span className="text-sm text-text-secondary mb-1">/ 5</span>
          </div>
          <p className="text-xs text-text-secondary mt-2">
            CSAT basé sur les sondages post-conversation.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-border p-6">
          <h3 className="font-semibold mb-4">Conversations par jour</h3>
          <div className="h-32 flex items-center justify-center text-text-secondary text-sm">
            Graphique apparaîtra ici
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border p-6">
          <h3 className="font-semibold mb-4">Questions fréquentes non couvertes</h3>
          <div className="h-32 flex items-center justify-center text-text-secondary text-sm">
            Aucune donnée pour le moment
          </div>
        </div>
      </div>
    </div>
  );
}
