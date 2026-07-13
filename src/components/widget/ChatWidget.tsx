"use client";

import { useState, useRef, useEffect } from "react";

interface ChatWidgetProps {
  tenantId: string;
  chatbotName?: string;
  primaryColor?: string;
}

interface Message {
  id: string;
  content: string;
  sender: "customer" | "bot";
  timestamp: Date;
}

export function ChatWidget({
  tenantId,
  chatbotName = "Assistant",
  primaryColor = "#4f46e5",
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content: `Bonjour ! Je suis ${chatbotName}. Comment puis-je vous aider ?`,
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    // Add customer message
    const customerMsg: Message = {
      id: `msg-${Date.now()}`,
      content: input.trim(),
      sender: "customer",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, customerMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          message: customerMsg.content,
          conversationId: `conv-${tenantId}`,
          channelType: "web_widget",
        }),
      });

      if (!res.ok) throw new Error("API error");

      const data = await res.json();
      const botMsg: Message = {
        id: `msg-${Date.now()}`,
        content: data.reply,
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      // Fallback message on error
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          content: "Désolé, je rencontre un problème technique. Veuillez réessayer dans un instant.",
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-widget-container">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white text-2xl hover:scale-105 active:scale-95 transition-transform"
        style={{ backgroundColor: primaryColor }}
        aria-label="Ouvrir le chat"
      >
        {isOpen ? "✕" : "💬"}
      </button>

      {/* Chat window */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-border overflow-hidden animate-fade-in">
          {/* Header */}
          <div
            className="p-4 text-white"
            style={{ backgroundColor: primaryColor }}
          >
            <p className="font-semibold">{chatbotName}</p>
            <p className="text-xs opacity-80">En ligne • Réponse instantanée</p>
          </div>

          {/* Messages */}
          <div className="h-80 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === "customer" ? "justify-end" : "justify-start"} animate-slide-up`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                    msg.sender === "customer"
                      ? "text-white"
                      : "bg-surface-secondary text-text-primary"
                  }`}
                  style={
                    msg.sender === "customer"
                      ? { backgroundColor: primaryColor }
                      : undefined
                  }
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-surface-secondary px-4 py-3 rounded-2xl flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-2 h-2 bg-text-secondary rounded-full animate-pulse"
                      style={{ animationDelay: `${i * 200}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSend}
            className="border-t border-border p-3 flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Écrivez votre message..."
              className="flex-1 px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-4 py-2 rounded-xl text-white text-sm font-medium disabled:opacity-50 transition-colors"
              style={{ backgroundColor: primaryColor }}
            >
              {loading ? "..." : "→"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
