// Anthropic provider — supports image via base64
import type { OrchestrationRequest } from "../types";

interface ContentBlock {
  type: "text" | "image";
  text?: string;
  source?: {
    type: "base64";
    media_type: string;
    data: string;
  };
}

export async function callAnthropic(apiKey: string, model: string, request: OrchestrationRequest) {
  const systemMsg = request.systemPrompt;
  const chatMessages: { role: string; content: string | ContentBlock[] }[] = request.conversationHistory.map(m => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));

  const userContent: ContentBlock[] = await buildContentBlocks(request);
  chatMessages.push({ role: "user", content: userContent });

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
      max_tokens: 4096,
      temperature: parseFloat(systemMsg.match(/TEMPERATURE:\s*([\d.]+)/i)?.[1] || "0.7"),
    }),
    signal: AbortSignal.timeout(45000),
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

async function buildContentBlocks(request: OrchestrationRequest): Promise<ContentBlock[]> {
  const blocks: ContentBlock[] = [{ type: "text", text: request.message || "Décris cette image." }];

  if (request.attachments) {
    for (const att of request.attachments) {
      if (att.type === "image") {
        try {
          const b64 = await urlToBase64(att.url);
          blocks.push({
            type: "image",
            source: { type: "base64", media_type: att.mimeType || "image/jpeg", data: b64 },
          });
        } catch {
          blocks.push({ type: "text", text: `[Image: ${att.url}]` });
        }
      }
      if (att.type === "audio") {
        blocks.push({ type: "text", text: `[Audio joint: ${att.url}]` });
      }
    }
  }
  return blocks;
}

async function urlToBase64(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.toString("base64");
}
