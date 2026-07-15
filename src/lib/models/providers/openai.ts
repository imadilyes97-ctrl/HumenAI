// OpenAI provider — supports image_url native
import type { OrchestrationRequest } from "../types";

interface ContentBlock {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string; detail?: "low" | "high" | "auto" };
}

export async function callOpenAI(apiKey: string, model: string, request: OrchestrationRequest) {
  const content: ContentBlock[] = buildContentBlocks(request);

  const messages: { role: string; content: ContentBlock[] | string }[] = [
    { role: "system", content: request.systemPrompt },
    ...request.conversationHistory.map(m => ({
      role: m.role,
      content: m.content,
    })),
    { role: "user", content },
  ];

  const body: Record<string, unknown> = {
    model,
    messages,
    max_tokens: 4096,
    temperature: parseFloat(request.systemPrompt.match(/TEMPERATURE:\s*([\d.]+)/i)?.[1] || "0.7"),
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return {
    reply: data.choices[0].message.content,
    provider: "openai" as const,
    model,
    tokensUsed: {
      prompt: data.usage?.prompt_tokens,
      completion: data.usage?.completion_tokens,
    },
  };
}

function buildContentBlocks(request: OrchestrationRequest): ContentBlock[] {
  const blocks: ContentBlock[] = [{ type: "text", text: request.message || "Décris cette image." }];

  if (request.attachments) {
    for (const att of request.attachments) {
      if (att.type === "image") {
        // Priorité data (base64 direct) > URL (évite les problèmes d'expiration Meta)
        const imageUrl = att.data
          ? `data:${att.mimeType || "image/jpeg"};base64,${att.data}`
          : att.url;
        blocks.push({
          type: "image_url",
          image_url: { url: imageUrl, detail: "auto" },
        });
      }
      if (att.type === "audio") {
        blocks.push({ type: "text", text: `[Audio joint: ${att.url}]` });
      }
    }
  }
  return blocks;
}
