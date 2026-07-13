// Anthropic provider
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { OrchestrationRequest } from "../types";

export async function callAnthropic(apiKey: string, model: string, request: OrchestrationRequest) {
  const systemMsg = request.systemPrompt;
  const chatMessages = request.conversationHistory.map(m => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));

  chatMessages.push({ role: "user", content: buildContent(request) });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      system: systemMsg,
      messages: chatMessages,
      max_tokens: 2048,
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return {
    reply: data.content[0].text,
    provider: "anthropic" as const,
    model,
    tokensUsed: {
      prompt: data.usage?.input_tokens,
      completion: data.usage?.output_tokens,
    },
  };
}

function buildContent(request: OrchestrationRequest): string | any[] {
  if (!request.attachments || request.attachments.length === 0) {
    return request.message;
  }

  const content: any[] = [{ type: "text", text: request.message }];

  for (const att of request.attachments) {
    if (att.type === "image") {
      content.push({
        type: "image",
        source: {
          type: "url",
          url: att.url,
        },
      });
    }
    if (att.type === "audio") {
      content.push({ type: "text", text: `[Message vocal: ${att.url}]` });
    }
  }

  return content;
}
