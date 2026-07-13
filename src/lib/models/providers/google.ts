// Google Gemini provider
import type { OrchestrationRequest } from "../types";

export async function callGoogle(apiKey: string, model: string, request: OrchestrationRequest) {
  const contents: any[] = [];

  for (const msg of request.conversationHistory) {
    contents.push({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    });
  }

  const userParts: any[] = [{ text: request.message }];
  if (request.attachments) {
    for (const att of request.attachments) {
      if (att.type === "image") {
        const b64 = await urlToBase64(att.url);
        userParts.push({
          inline_data: { mime_type: att.mimeType, data: b64 },
        });
      }
      if (att.type === "audio") {
        userParts.push({ text: `[Audio: ${att.url}]` });
      }
    }
  }
  contents.push({ role: "user", parts: userParts });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: request.systemPrompt }] },
        generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
      }),
      signal: AbortSignal.timeout(30000),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return {
    reply: data.candidates?.[0]?.content?.parts?.[0]?.text || "Aucune réponse générée.",
    provider: "google" as const,
    model,
    tokensUsed: {
      prompt: data.usageMetadata?.promptTokenCount,
      completion: data.usageMetadata?.candidatesTokenCount,
    },
  };
}

async function urlToBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.toString("base64");
}
