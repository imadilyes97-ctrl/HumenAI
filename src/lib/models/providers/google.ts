// Google Gemini provider
/* eslint-disable @typescript-eslint/no-explicit-any */
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
        if (att.data) {
          // ✅ Image téléchargée côté serveur → inline_data direct
          const sizeKB = (att.data.length / 1024).toFixed(1);
          console.log(`[IMG-FLUX] [callGoogle] ✅ Image reçue en base64 (${sizeKB} KB) — envoi en inline_data à Gemini`);
          userParts.push({
            inline_data: { mime_type: att.mimeType || "image/jpeg", data: att.data },
          });
        } else {
          console.log(`[IMG-FLUX] [callGoogle] ⚠️ Pas de data — tentative urlToBase64 fallback: ${att.url?.slice(0, 60)}`);
          try {
            const b64 = await urlToBase64(att.url);
            console.log(`[IMG-FLUX] [callGoogle] ✅ urlToBase64 réussi (${(b64.length / 1024).toFixed(1)} KB)`);
            userParts.push({
              inline_data: { mime_type: att.mimeType || "image/jpeg", data: b64 },
            });
          } catch (err) {
            console.warn(`[IMG-FLUX] [callGoogle] ❌❌ urlToBase64 ÉCHOUÉ — Gemini ne verra PAS l'image: ${err instanceof Error ? err.message : err}`);
            userParts.push({
              text: `📸 Le client a envoyé une photo (URL: ${att.url})`,
            });
          }
        }
      }
      if (att.type === "audio") {
        if (att.data) {
          console.log(`[IMG-FLUX] [callGoogle] ✅ Audio reçu en base64 — envoi inline`);
          const audioMime = att.mimeType || "audio/ogg; codecs=opus";
          userParts.push({
            inline_data: { mime_type: audioMime, data: att.data },
          });
        } else {
          userParts.push({ text: `📢 Message vocal reçu. URL: ${att.url}` });
        }
      }
    }
  }
  contents.push({ role: "user", parts: userParts });

  // Log la taille du payload envoyé à Gemini pour debug timeout
  const payloadSize = JSON.stringify({ contents, systemInstruction: { parts: [{ text: request.systemPrompt?.slice(0, 100) }] } }).length;
  console.log(`[IMG-FLUX] [callGoogle] 📦 Payload approximatif: ${(payloadSize / 1024).toFixed(1)} KB | modèle: ${model}`);

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
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      "Referer": "https://www.facebook.com/",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.toString("base64");
}
