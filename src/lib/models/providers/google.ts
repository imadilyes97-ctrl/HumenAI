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
        // Priorité data (base64 direct depuis download serveur) > téléchargement URL
        if (att.data) {
          userParts.push({
            inline_data: { mime_type: att.mimeType || "image/jpeg", data: att.data },
          });
        } else {
          // Tentative de téléchargement depuis l'URL (Gemini peut réussir là où
          // notre serveur a échoué — User-Agent navigateur, cookies, etc.)
          try {
            const b64 = await urlToBase64(att.url);
            userParts.push({
              inline_data: { mime_type: att.mimeType || "image/jpeg", data: b64 },
            });
          } catch {
            // Même Gemini n'arrive pas à télécharger l'image (URL expirée)
            // On inclut quand même l'URL et on laisse Gemini décider
            userParts.push({
              text: `📸 Le client a envoyé une photo (URL: ${att.url})`,
            });
          }
        }
      }
      if (att.type === "audio") {
        // Gemini supporte l'audio inline nativement (opus, mp3, wav, etc.)
        if (att.data) {
          const audioMime = att.mimeType || "audio/ogg; codecs=opus";
          userParts.push({
            inline_data: { mime_type: audioMime, data: att.data },
          });
        } else {
          // Fallback texte si audio non téléchargé
          userParts.push({ text: `📢 Message vocal reçu de la part du client. Essaie de le lire depuis cette URL si possible: ${att.url}` });
        }
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
