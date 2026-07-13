// DeepSeek provider (text-only)
import type { OrchestrationRequest } from "../types";

export async function callDeepSeek(apiKey: string, model: string, request: OrchestrationRequest) {
  const messages = [
    { role: "system", content: request.systemPrompt },
    ...request.conversationHistory.map(m => ({
      role: m.role,
      content: m.content,
    })),
    { role: "user", content: request.message },
  ];

  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, max_tokens: 2048, temperature: 0.3 }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepSeek ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return {
    reply: data.choices[0].message.content,
    provider: "deepseek" as const,
    model,
    tokensUsed: {
      prompt: data.usage?.prompt_tokens,
      completion: data.usage?.completion_tokens,
    },
  };
}
