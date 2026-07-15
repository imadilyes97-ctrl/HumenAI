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

// ═══════════════════════════════════════════════════════════════
// LOG MARKERS pour debug Vercel — cherche "[IMG-FLUX]"
// ═══════════════════════════════════════════════════════════════
// Chaque étape du téléchargement d'image Messenger est tracée.
// Dans Vercel → Functions → logs, cherche "IMG-FLUX" pour voir
// exactement où le flux bloque.
// ═══════════════════════════════════════════════════════════════

function appendAccessToken(url: string, token: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}access_token=${token}`;
}

// ---------------------------------------------------------------------------
// Helper : user-agent plus réaliste pour contourner certains blocks Meta CDN
// ---------------------------------------------------------------------------

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
  "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7,ar;q=0.6",
  "Sec-Fetch-Site": "cross-site",
  "Sec-Fetch-Mode": "no-cors",
  "Sec-Fetch-Dest": "image",
  "Referer": "https://www.facebook.com/",
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
      console.warn(`[IMG-FLUX] [downloadMetaImage] HTTP ${res.status} pour ${url.slice(0, 80)} — ÉCHEC`);
      return null;
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await res.arrayBuffer());
    const sizeKB = (buffer.length / 1024).toFixed(1);
    console.log(`[IMG-FLUX] [downloadMetaImage] ✅ ${url.slice(0, 60)}… (${sizeKB} KB | ${contentType})`);

    if (buffer.length > 10 * 1024 * 1024) {
      console.warn(`[IMG-FLUX] [downloadMetaImage] ❌ Trop volumineux: ${buffer.length} bytes`);
      return null;
    }

    return { data: buffer.toString("base64"), mimeType: contentType, size: buffer.length };
  } catch (err) {
    console.error(`[IMG-FLUX] [downloadMetaImage] ❌ ERREUR ${url.slice(0, 60)}:`, err instanceof Error ? err.message : err);
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
        console.log(`[IMG-FLUX] [Graph API stratégie-1] ✅ URL fraîche obtenue: ${cdnUrl.slice(0, 60)}`);
        const imgRes = await fetch(appendAccessToken(cdnUrl, pageAccessToken), {
          signal: AbortSignal.timeout(15000),
          headers: FETCH_HEADERS,
        });
        if (imgRes.ok) {
          const buffer = Buffer.from(await imgRes.arrayBuffer());
          if (buffer.length <= 10 * 1024 * 1024) {
            console.log(`[IMG-FLUX] [Graph API stratégie-1] ✅ ${attachmentId} (${(buffer.length / 1024).toFixed(1)} KB)`);
            return { data: buffer.toString("base64"), mimeType };
          } else {
            console.warn(`[IMG-FLUX] [Graph API stratégie-1] ❌ Trop volumineux: ${buffer.length} bytes`);
          }
        } else {
          console.warn(`[IMG-FLUX] [Graph API stratégie-1] ❌ HTTP ${imgRes.status} sur la fresh URL`);
        }
      }
    } else {
      const errBody = await graphRes.text();
      if (isPermissionError(errBody)) {
        console.warn(`[IMG-FLUX] [Graph API] ⛔ PERMISSION INSUFFISANTE — Token nécessite pages_read_engagement (attachmentId: ${attachmentId})`);
      } else {
        console.warn(`[IMG-FLUX] [Graph API] ⛔ HTTP ${graphRes.status}: ${errBody.slice(0, 200)}`);
      }
    }
  } catch (err) {
    console.warn(`[IMG-FLUX] [Graph API] ❌ ERREUR ${attachmentId}:`, err instanceof Error ? err.message : err);
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
        console.log(`[IMG-FLUX] [Graph API stratégie-2 thumbnail] ✅ ${attachmentId} (${(buffer.length / 1024).toFixed(1)} KB)`);
        return { data: buffer.toString("base64"), mimeType };
      } else {
        console.warn(`[IMG-FLUX] [Graph API stratégie-2 thumbnail] ❌ Taille invalide: ${buffer.length} bytes`);
      }
    } else {
      console.warn(`[IMG-FLUX] [Graph API stratégie-2 thumbnail] ❌ HTTP ${thumbRes.status}`);
    }
  } catch (err) {
    console.warn(`[IMG-FLUX] [Graph API stratégie-2 thumbnail] ❌ ERREUR: ${err instanceof Error ? err.message : err}`);
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
  // Messenger: page_access_token, access_token, fb_page_token
  // Instagram: instagram_access_token, ig_access_token
  // WhatsApp: bearer_token, token
  const accessToken = credentials.accessToken || credentials.access_token ||
    credentials.pageAccessToken || credentials.page_access_token ||
    credentials.fb_page_token || credentials.fan_page_access_token ||
    credentials.bearer_token || credentials.token ||
    "";
  const apiKey = credentials.apiKey || credentials.api_key || "";

  console.log(`[IMG-FLUX] [downloadImageFromMetaMessage] 🎯 URL: ${imageUrl.slice(0, 60)}... Token présent: ${accessToken ? "OUI (" + accessToken.slice(0, 10) + "..." : "NON"}`);

  // 1. URL sans token (CDN publique)
  let result = await downloadMetaImage(imageUrl);
  if (result) {
    console.log(`[IMG-FLUX] [downloadImageFromMetaMessage] ✅ Stratégie 1 OK (sans token)`);
    return { data: result.data, mimeType: result.mimeType };
  }
  console.log(`[IMG-FLUX] [downloadImageFromMetaMessage] ❌ Stratégie 1 échouée (sans token)`);

  // 2. URL avec accessToken (camelCase)
  if (accessToken) {
    result = await downloadMetaImage(imageUrl, accessToken);
    if (result) {
      console.log(`[IMG-FLUX] [downloadImageFromMetaMessage] ✅ Stratégie 2 OK (avec token)`);
      return { data: result.data, mimeType: result.mimeType };
    }
    console.log(`[IMG-FLUX] [downloadImageFromMetaMessage] ❌ Stratégie 2 échouée (avec token)`);
  }

  // 3. URL avec apiKey (fallback WhatsApp)
  if (apiKey) {
    result = await downloadMetaImage(imageUrl, apiKey);
    if (result) {
      console.log(`[IMG-FLUX] [downloadImageFromMetaMessage] ✅ Stratégie 3 OK (apiKey)`);
      return { data: result.data, mimeType: result.mimeType };
    }
  }

  // 4. URL sans query params
  const cleanUrl = imageUrl.split("?")[0];
  result = await downloadMetaImage(cleanUrl);
  if (result) {
    console.log(`[IMG-FLUX] [downloadImageFromMetaMessage] ✅ Stratégie 4 OK (sans query)`);
    return { data: result.data, mimeType: result.mimeType };
  }

  console.log(`[IMG-FLUX] [downloadImageFromMetaMessage] ❌❌ TOUTES LES STRATÉGIES ÉCHOUÉES`);
  return null;
}
