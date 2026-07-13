"use client";

import { useState, useCallback } from "react";

interface ConversationHook {
  messages: Message[];
  sendMessage: (text: string) => Promise<void>;
  isSending: boolean;
  error: string | null;
}

interface Message {
  id: string;
  content: string;
  sender: "customer" | "bot";
  timestamp: Date;
}

export function useConversation(tenantId: string): ConversationHook {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      setIsSending(true);
      setError(null);

      const customerMsg: Message = {
        id: `msg-${Date.now()}`,
        content: text,
        sender: "customer",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, customerMsg]);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenantId,
            message: text,
            channelType: "web_widget",
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const botMsg: Message = {
          id: `msg-${Date.now()}`,
          content: data.reply,
          sender: "bot",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMsg]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur inconnue");
      } finally {
        setIsSending(false);
      }
    },
    [tenantId]
  );

  return { messages, sendMessage, isSending, error };
}
