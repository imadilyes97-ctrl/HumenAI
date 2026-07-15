// OpenRouter provider (multi-model gateway — supports image_url like OpenAI)
import type { OrchestrationRequest } from "../types";

interface ContentBlock {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string; detail?: string };
}

export async function callOpenRouter(apiKey: string, model: string, request: OrchestrationRequest) {
  const userContent: ContentBlock[] = buildContentBlocks(request);

  const messages = [
    { role: "system", content: request.systemPrompt },
    ...request.conversationHistory.map(m => ({
      role: m.role,
      content: m.content,
    })),
    { role: "user", content: userContent.length === 1 ? userContent[0].text || request.message : userContent },
  ];

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://humenai.app",
      "X-Title": "HumenAI",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 4096,
      temperature: parseFloat(request.systemPrompt.match(/TEMPERATURE:\s*([\d.]+)/i)?.[1] || "0.7"),
    }),
    signal: AbortSignal.timeout(45000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return {
    reply: data.choices[0].message.content,
    provider: "openrouter" as const,
    model: data.model || model,
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
        // Priorité data (base64) > URL (URL Meta expirent)
        const imageUrl = att.data
          ? `data:${att.mimeType || "image/jpeg"};base64,${att.data}`
          : att.url;
        blocks.push({ type: "image_url", image_url: { url: imageUrl, detail: "auto" } });
      }
      if (att.type === "audio") {
        blocks.push({ type: "text", text: `[Audio joint: ${att.url}]` });
      }
    }
  }
  return blocks;
}
