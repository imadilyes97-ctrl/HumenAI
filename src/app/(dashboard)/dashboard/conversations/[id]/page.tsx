"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Message {
  id: string;
  sender: "customer" | "bot" | "human_agent";
  content: string;
  created_at: string;
  tokens_prompt?: number | null;
  tokens_completion?: number | null;
  latency_ms?: number | null;
}

interface ConversationDetail {
  id: string;
  channel_type: string;
  channelName: string;
  customer_id: string;
  customer_name: string | null;
  customer_email: string | null;
  status: string;
  created_at: string;
  last_message_at: string;
}

export default function ConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [takingOver, setTakingOver] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversation();
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadConversation() {
    setLoading(true);
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setConversation(data.conversation);
        setMessages(data.messages || []);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyText.trim(), channelReply: true }),
      });

      if (res.ok) {
        setReplyText("");
        loadConversation();
      }
    } catch { /* silent */ }
    finally { setSending(false); }
  }

  async function handleTakeOver() {
    setTakingOver(true);
    try {
      await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "with_human" }),
      });
      loadConversation();
    } catch { /* silent */ }
    finally { setTakingOver(false); }
  }

  async function handleClose() {
    await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "closed" }),
    });
    router.push("/dashboard");
  }

  // Status badges
  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-blue-50 text-blue-700 border-blue-200",
      waiting_human: "bg-amber-50 text-amber-700 border-amber-200",
      with_human: "bg-green-50 text-green-700 border-green-200",
      closed: "bg-gray-50 text-gray-500 border-gray-200",
    };
    const labels: Record<string, string> = {
      active: "🤖 Actif (IA)",
      waiting_human: "🆘 En attente humain",
      with_human: "👤 Pris par un agent",
      closed: "✅ Fermé",
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${styles[status] || styles.active}`}>
        {labels[status] || status}
      </span>
    );
  };

  // Sender icon + style
  function MessageBubble({ msg }: { msg: Message }) {
    const isCustomer = msg.sender === "customer";
    const isBot = msg.sender === "bot";

    return (
      <div className={`flex ${isCustomer ? "justify-start" : "justify-end"}`}>
        <div className={`max-w-[75%] ${isCustomer ? "order-1" : "order-2"}`}>
          <div className={`flex items-center gap-1.5 mb-0.5 ${isCustomer ? "" : "justify-end"}`}>
            <span className="text-xs text-text-secondary font-medium">
              {isCustomer ? "Client" : isBot ? "🤖 Assistant IA" : "👤 Agent"}
            </span>
            <span className="text-[10px] text-text-secondary">
              {new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <div
            className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
              isCustomer
                ? "bg-gray-100 text-text-primary rounded-tl-md"
                : isBot
                ? "bg-brand-50 text-brand-900 rounded-tr-md"
                : "bg-green-50 text-green-900 rounded-tr-md"
            }`}
          >
            {msg.content}
            {isBot && msg.latency_ms && (
              <div className="text-[10px] opacity-50 mt-1">
                {msg.latency_ms}ms · {(msg.tokens_prompt || 0) + (msg.tokens_completion || 0)} tokens
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-12 text-text-secondary">Chargement...</div>;
  }

  if (!conversation) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">Conversation introuvable</p>
        <Link href="/dashboard" className="text-brand-600 hover:underline mt-2 inline-block">← Retour</Link>
      </div>
    );
  }

  const isWaiting = conversation.status === "waiting_human";
  const isActive = conversation.status === "active" || conversation.status === "with_human";
  const isClosed = conversation.status === "closed";

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-text-secondary hover:text-text-primary p-1">
            ←
          </Link>
          <div>
            <h1 className="text-lg font-bold">{conversation.customer_name || `Client ${conversation.customer_id.slice(0, 8)}`}</h1>
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <span>{conversation.channelName}</span>
              <span>·</span>
              {statusBadge(conversation.status)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isWaiting && (
            <button
              onClick={handleTakeOver}
              disabled={takingOver}
              className="bg-amber-600 text-white text-sm px-4 py-2 rounded-lg font-medium hover:bg-amber-700 transition-colors disabled:opacity-50"
            >
              {takingOver ? "Prise en cours..." : "🆘 Prendre en charge"}
            </button>
          )}
          {isActive && (
            <button
              onClick={handleClose}
              className="border border-border text-text-secondary text-sm px-3 py-2 rounded-lg font-medium hover:bg-surface-secondary transition-colors"
            >
              Fermer
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 bg-white rounded-xl border border-border p-4 mb-4">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-text-secondary">Aucun message</div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Zone de réponse */}
      {!isClosed && (
        <form onSubmit={handleSendReply} className="shrink-0 flex items-center gap-3">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={isWaiting ? "Répondre au client (il reçoit le message sur Messenger/WhatsApp)..." : "Répondre au client..."}
            className="flex-1 px-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            disabled={sending}
            autoFocus
          />
          <button
            type="submit"
            disabled={sending || !replyText.trim()}
            className="bg-brand-600 text-white px-5 py-3 rounded-xl font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {sending ? "..." : "Envoyer"}
          </button>
        </form>
      )}
    </div>
  );
}
