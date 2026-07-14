"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Conversation {
  id: string;
  customer_id: string;
  customer_name: string | null;
  customer_email: string | null;
  channel_type: string;
  status: "active" | "waiting_human" | "with_human" | "closed";
  message_count: number;
  last_message_at: string;
  created_at: string;
}

interface DashboardStats {
  active: number;
  waitingHuman: number;
  today: number;
  resolved: number;
}

const STATUS_LABELS: Record<string, string> = {
  active: "🤖 IA active",
  waiting_human: "🆘 Attend humain",
  with_human: "👤 Agent",
  closed: "✅ Fermé",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-blue-50 text-blue-700",
  waiting_human: "bg-amber-50 text-amber-700",
  with_human: "bg-green-50 text-green-700",
  closed: "bg-gray-50 text-gray-500",
};

function getChannelIcon(type: string): string {
  const icons: Record<string, string> = {
    whatsapp: "📱", instagram: "📸", messenger: "💬",
    tiktok: "🎵", shopify: "🛍️", web_widget: "🌐", email: "📧",
  };
  return icons[type] || "💬";
}

export default function DashboardPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({ active: 0, waitingHuman: 0, today: 0, resolved: 0 });

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 15000);
    return () => clearInterval(interval);
  }, []);

  async function loadConversations() {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        const list = data.conversations || [];
        setConversations(list);
        setStats({
          active: list.filter((c: Conversation) => c.status === "active").length,
          waitingHuman: list.filter((c: Conversation) => c.status === "waiting_human").length,
          today: list.filter((c: Conversation) => {
            const d = new Date(c.created_at);
            const now = new Date();
            return d.toDateString() === now.toDateString();
          }).length,
          resolved: list.filter((c: Conversation) => c.status === "closed").length,
        });
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "à l'instant";
    if (mins < 60) return `il y a ${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `il y a ${hours}h`;
    return new Date(dateStr).toLocaleDateString("fr-FR");
  }

  // Trier : waiting_human en premier, puis actifs, puis fermés
  const sortedConversations = [...conversations].sort((a, b) => {
    const order: Record<string, number> = { waiting_human: 0, active: 1, with_human: 2, closed: 3 };
    return (order[a.status] ?? 4) - (order[b.status] ?? 4) || new Date(b.last_message_at || b.created_at).getTime() - new Date(a.last_message_at || a.created_at).getTime();
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Conversations</h1>
          <p className="text-sm text-text-secondary mt-1">
            Suivez et gérez les échanges avec vos clients.
          </p>
        </div>
        {stats.waitingHuman > 0 && (
          <span className="bg-red-50 text-red-700 px-3 py-1.5 rounded-full text-sm font-medium animate-pulse">
            🆘 {stats.waitingHuman} en attente
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-border">
          <p className="text-xs text-text-secondary uppercase tracking-wider">Actives (IA)</p>
          <p className="text-2xl font-bold mt-1">{stats.active}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-border">
          <p className="text-xs text-text-secondary uppercase tracking-wider">
            {stats.waitingHuman > 0 ? "🆘 En attente" : "En attente"}
          </p>
          <p className={`text-2xl font-bold mt-1 ${stats.waitingHuman > 0 ? "text-amber-600" : ""}`}>{stats.waitingHuman}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-border">
          <p className="text-xs text-text-secondary uppercase tracking-wider">Aujourd&apos;hui</p>
          <p className="text-2xl font-bold mt-1">{stats.today}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-border">
          <p className="text-xs text-text-secondary uppercase tracking-wider">Résolues</p>
          <p className="text-2xl font-bold mt-1">{stats.resolved}</p>
        </div>
      </div>

      {/* Liste des conversations */}
      {loading ? (
        <div className="text-center py-12 text-text-secondary">
          Chargement des conversations...
        </div>
      ) : sortedConversations.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-8 text-center">
          <div className="text-4xl mb-3">💬</div>
          <h3 className="font-semibold text-lg">Aucune conversation</h3>
          <p className="text-sm text-text-secondary mt-1">
            Les conversations apparaîtront ici une fois vos canaux connectés et actifs.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border">
          {sortedConversations.map((conv, i) => (
            <Link
              key={conv.id}
              href={`/dashboard/conversations/${conv.id}`}
              className={`flex items-center justify-between p-4 hover:bg-surface-secondary transition-colors ${
                i > 0 ? "border-t border-border" : ""
              } ${conv.status === "waiting_human" ? "bg-amber-50/50 hover:bg-amber-50" : ""}`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 ${
                  conv.status === "waiting_human" ? "bg-amber-100" : "bg-brand-100"
                }`}>
                  {getChannelIcon(conv.channel_type)}
                </div>
                {/* Infos */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {conv.customer_name || `Client ${conv.customer_id.slice(0, 8)}...`}
                    </p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[conv.status] || ""}`}>
                      {STATUS_LABELS[conv.status] || conv.status}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {conv.message_count} message{conv.message_count > 1 ? "s" : ""} · {timeAgo(conv.last_message_at || conv.created_at)}
                  </p>
                </div>
              </div>
              {/* Flèche */}
              <span className="text-text-secondary ml-3 text-lg">&rarr;</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
