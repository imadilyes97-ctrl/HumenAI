"use client";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Conversations</h1>
        <p className="text-sm text-text-secondary mt-1">
          Suivez et gérez les échanges avec vos clients.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white p-4 rounded-xl border border-border">
            <p className="text-xs text-text-secondary uppercase tracking-wider">{s.label}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
            <span
              className={`text-xs ${
                s.trend > 0 ? "text-green-600" : "text-red-500"
              }`}
            >
              {s.trend > 0 ? "+" : ""}
              {s.trend}% vs hier
            </span>
          </div>
        ))}
      </div>

      {/* Conversation list placeholder */}
      <div className="bg-white rounded-xl border border-border p-8 text-center">
        <div className="text-4xl mb-3">💬</div>
        <h3 className="font-semibold text-lg">Aucune conversation active</h3>
        <p className="text-sm text-text-secondary mt-1">
          Les conversations apparaîtront ici une fois vos canaux connectés.
        </p>
      </div>
    </div>
  );
}

const stats = [
  { label: "Actives", value: "0", trend: 0 },
  { label: "Aujourd'hui", value: "0", trend: 0 },
  { label: "Résolution auto", value: "0%", trend: 0 },
  { label: "Satisfaction", value: "—", trend: 0 },
];
