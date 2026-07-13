// OpenAI provider
import type { OrchestrationRequest } from "../types";

export async function callOpenAI(apiKey: string, model: string, request: OrchestrationRequest) {
  const messages: { role: string; content: any }[] = [
    { role: "system", content: request.systemPrompt },
    ...request.conversationHistory.map(m => ({
      role: m.role,
      content: m.content,
    })),
    { role: "user", content: buildContent(request) },
  ];

  const body: any = {
    model,
    messages,
    max_tokens: 2048,
    temperature: 0.3,
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
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

function buildContent(request: OrchestrationRequest): string | any[] {
  if (!request.attachments || request.attachments.length === 0) {
    return request.message;
  }

  const content: any[] = [{ type: "text", text: request.message }];

  for (const att of request.attachments) {
    if (att.type === "image") {
      content.push({
        type: "image_url",
        image_url: { url: att.url, detail: "auto" },
      });
    }
    if (att.type === "audio") {
      content.push({ type: "text", text: `[Message vocal disponible à: ${att.url}]` });
    }
  }

  return content;
}
