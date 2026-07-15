// ============================================================================
// HumenAI — Media Downloader
// Télécharge les images des canaux Meta (Messenger/Instagram/WhatsApp)
// et les convertit en base64 pour les passer directement aux providers IA.
//
// 🔒 SÉCURITÉ : Les images sont traitées UNIQUEMENT en mémoire RAM.
//    Aucun fichier n'est écrit sur le disque. Le buffer est libéré par le
//    garbage collector dès que la réponse IA est envoyée.
// ============================================================================

interface DownloadResult {
  data: string;
  mimeType: string;
  size: number;
}

// ---------------------------------------------------------------------------
// Détection d'erreur de permission Meta
// ---------------------------------------------------------------------------

function isPermissionError(body: string | Record<string, unknown>): boolean {
  const msg = typeof body === "string" ? body : (body?.error as Record<string, unknown> | undefined)?.message as string || "";
  return msg.includes("permission") || msg.includes("access_token") || msg.includes("pages_read_engagement");
}

// ---------------------------------------------------------------------------
// Helper : construit une URL avec le bon séparateur de query params
// ---------------------------------------------------------------------------

function appendAccessToken(url: string, token: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}access_token=${token}`;
}

// ---------------------------------------------------------------------------
// Helper : user-agent plus réaliste pour contourner certains blocks Meta CDN
// ---------------------------------------------------------------------------

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; HumenAI/1.0; +https://humenai.app)",
  "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
};

// ---------------------------------------------------------------------------
// Télécharge depuis une URL (raw bytes → base64)
// ---------------------------------------------------------------------------

export async function downloadMetaImage(
  url: string,
  accessToken?: string
): Promise<DownloadResult | null> {
  try {
    if (url.startsWith("data:")) {
      const [header, data] = url.split(",");
      const mimeType = header.match(/data:([^;]+)/)?.[1] || "image/jpeg";
      return { data, mimeType, size: data.length };
    }

    const fetchUrl = accessToken ? appendAccessToken(url, accessToken) : url;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(fetchUrl, {
      signal: controller.signal,
      headers: FETCH_HEADERS,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[downloader] HTTP ${res.status} pour ${url.slice(0, 60)}`);
      return null;
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await res.arrayBuffer());
    const sizeKB = (buffer.length / 1024).toFixed(1);
    console.log(`[downloader] ✅ ${url.slice(0, 50)}… (${sizeKB} KB)`);

    if (buffer.length > 10 * 1024 * 1024) {
      console.warn(`[downloader] Image trop volumineuse: ${buffer.length} bytes`);
      return null;
    }

    return { data: buffer.toString("base64"), mimeType: contentType, size: buffer.length };
  } catch (err) {
    console.error(`[downloader] Erreur téléchargement ${url.slice(0, 60)}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Télécharge une image Messenger via l'API Graph (attachment_id)
// Plus fiable que les URLs platform-lookaside qui expirent.
// ---------------------------------------------------------------------------

export async function downloadMessengerAttachmentViaGraph(
  attachmentId: string,
  pageAccessToken: string
): Promise<{ data: string; mimeType: string } | null> {
  // Stratégie 1: {attachment-id}?fields=url → fresh URL → download
  try {
    const graphRes = await fetch(
      `https://graph.facebook.com/v21.0/${attachmentId}?fields=url,mime_type&access_token=${pageAccessToken}`,
      { signal: AbortSignal.timeout(10000), headers: { "Accept": "application/json" } }
    );

    if (graphRes.ok) {
      const graphData = await graphRes.json();
      const cdnUrl = graphData.url as string | undefined;
      const mimeType = (graphData.mime_type as string) || "image/jpeg";

      if (cdnUrl) {
        const imgRes = await fetch(appendAccessToken(cdnUrl, pageAccessToken), {
          signal: AbortSignal.timeout(15000),
          headers: FETCH_HEADERS,
        });
        if (imgRes.ok) {
          const buffer = Buffer.from(await imgRes.arrayBuffer());
          if (buffer.length <= 10 * 1024 * 1024) {
            console.log(`[downloader] Graph API ✅ ${attachmentId} (${(buffer.length / 1024).toFixed(1)} KB)`);
            return { data: buffer.toString("base64"), mimeType };
          }
        }
      }
    } else {
      const errBody = await graphRes.text();
      if (isPermissionError(errBody)) {
        console.warn(`[downloader] ⛔ Permission insuffisante pour lire l'attachment ${attachmentId}`);
      } else {
        console.warn(`[downloader] Graph API ${graphRes.status}: ${errBody.slice(0, 200)}`);
      }
    }
  } catch (err) {
    console.warn(`[downloader] Graph API error ${attachmentId}:`, err instanceof Error ? err.message : err);
  }

  // Stratégie 2: {attachment-id}/picture → thumbnail (moins de permissions requises)
  try {
    const thumbRes = await fetch(
      `https://graph.facebook.com/v21.0/${attachmentId}/picture?access_token=${pageAccessToken}&type=large`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (thumbRes.ok) {
      const mimeType = thumbRes.headers.get("content-type") || "image/jpeg";
      const buffer = Buffer.from(await thumbRes.arrayBuffer());
      if (buffer.length > 1024 && buffer.length <= 10 * 1024 * 1024) {
        console.log(`[downloader] Graph /picture ✅ ${attachmentId} (${(buffer.length / 1024).toFixed(1)} KB)`);
        return { data: buffer.toString("base64"), mimeType };
      }
    }
  } catch {
    // Silencieux — fallback uniquement
  }

  return null;
}

// ---------------------------------------------------------------------------
// Télécharge une image WhatsApp via Media API
// ---------------------------------------------------------------------------

export async function downloadWhatsAppMedia(
  mediaId: string,
  whatsappToken: string
): Promise<{ data: string; mimeType: string } | null> {
  try {
    // 1. Get media URL (WhatsApp Cloud API: GET /{media-id}?access_token=...)
    const metaRes = await fetch(
      `https://graph.facebook.com/v21.0/${mediaId}?access_token=${whatsappToken}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!metaRes.ok) {
      console.warn(`[downloader] WhatsApp Media API ${metaRes.status} pour ${mediaId}`);
      return null;
    }

    const metaData = await metaRes.json() as Record<string, string>;
    const fileUrl = metaData.url;
    if (!fileUrl) return null;

    // 2. Download from URL with token
    const res = await fetch(fileUrl, {
      headers: { Authorization: `Bearer ${whatsappToken}`, ...FETCH_HEADERS },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;

    const mimeType = res.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > 10 * 1024 * 1024) return null;

    console.log(`[downloader] WhatsApp Media ✅ ${mediaId} (${(buffer.length / 1024).toFixed(1)} KB)`);
    return { data: buffer.toString("base64"), mimeType };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Point d'entrée principal — essaie toutes les stratégies
// ---------------------------------------------------------------------------

export async function downloadImageFromMetaMessage(
  imageUrl: string,
  credentials: Record<string, string>
): Promise<{ data: string; mimeType: string } | null> {
  // Essayer les tokens sous tous les noms possibles
  const accessToken = credentials.accessToken || credentials.access_token || credentials.pageAccessToken || "";
  const apiKey = credentials.apiKey || credentials.api_key || "";

  // 1. URL sans token (CDN publique)
  let result = await downloadMetaImage(imageUrl);

  // 2. URL avec accessToken (camelCase)
  if (!result && accessToken) {
    result = await downloadMetaImage(imageUrl, accessToken);
  }

  // 3. URL avec apiKey (fallback WhatsApp)
  if (!result && apiKey) {
    result = await downloadMetaImage(imageUrl, apiKey);
  }

  // 4. URL sans query params (cache-bust par proxy inversé)
  if (!result) {
    const cleanUrl = imageUrl.split("?")[0];
    result = await downloadMetaImage(cleanUrl);
  }

  return result ? { data: result.data, mimeType: result.mimeType } : null;
}
