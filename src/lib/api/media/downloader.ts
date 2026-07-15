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

/**
 * Télécharge une image depuis une URL Meta et la convertit en base64.
 * Utilise le token d'accès Meta pour les URLs protégées.
 */
export async function downloadMetaImage(
  url: string,
  accessToken?: string
): Promise<DownloadResult | null> {
  try {
    // Si l'URL est déjà une data URL, on la retourne directement
    if (url.startsWith("data:")) {
      const [header, data] = url.split(",");
      const mimeType = header.match(/data:([^;]+)/)?.[1] || "image/jpeg";
      return { data, mimeType, size: data.length };
    }

    // Ajouter le token d'accès si c'est une URL Meta protégée
    const fetchUrl =
      url.includes("platform-lookaside.fbsbx.com") && accessToken
        ? `${url}&access_token=${accessToken}`
        : url;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(fetchUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "HumenAI/1.0",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[downloader] HTTP ${res.status} pour ${url.slice(0, 60)}`);
      return null;
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await res.arrayBuffer());

    console.log(`[downloader] ✅ ${url.slice(0, 50)}… (${(buffer.length / 1024).toFixed(1)} KB)`);

    // Meta limite les images à 25MB pour les appels API
    // On ignore les fichiers > 10MB
    if (buffer.length > 10 * 1024 * 1024) {
      console.warn(`[downloader] Image trop volumineuse: ${buffer.length} bytes`);
      return null;
    }

    return {
      data: buffer.toString("base64"),
      mimeType: contentType,
      size: buffer.length,
    };
  } catch (err) {
    console.error(`[downloader] Erreur téléchargement ${url.slice(0, 60)}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Télécharge une image Messenger via l'API Graph (attachment_id).
 * Beaucoup plus fiable que les URLs platform-lookaside qui expirent.
 */
export async function downloadMessengerAttachmentViaGraph(
  attachmentId: string,
  pageAccessToken: string
): Promise<{ data: string; mimeType: string } | null> {
  try {
    // 1. Appeler l'API Graph pour obtenir une URL CDN fraîche
    const graphRes = await fetch(
      `https://graph.facebook.com/v21.0/${attachmentId}?fields=url,mime_type&access_token=${pageAccessToken}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!graphRes.ok) {
      console.warn(`[downloader] Graph API ${graphRes.status} pour attachment ${attachmentId}`);
      return null;
    }
    const graphData = await graphRes.json();
    const cdnUrl = graphData.url;
    const mimeType = graphData.mime_type || "image/jpeg";
    if (!cdnUrl) {
      console.warn(`[downloader] Pas d'URL CDN dans la réponse Graph pour ${attachmentId}`);
      return null;
    }

    // 2. Télécharger depuis l'URL CDN avec le token
    const imgRes = await fetch(`${cdnUrl}&access_token=${pageAccessToken}`, {
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": "HumenAI/1.0" },
    });
    if (!imgRes.ok) {
      console.warn(`[downloader] CDN HTTP ${imgRes.status} pour ${attachmentId}`);
      return null;
    }

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    if (buffer.length > 10 * 1024 * 1024) {
      console.warn(`[downloader] Image trop volumineuse: ${buffer.length} bytes`);
      return null;
    }

    console.log(`[downloader] Graph API OK ✅ ${attachmentId} (${(buffer.length / 1024).toFixed(1)} KB)`);
    return { data: buffer.toString("base64"), mimeType };
  } catch (err) {
    console.error(`[downloader] Graph API error ${attachmentId}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Cherche et télécharge une image depuis un message Meta.
 * Gère le format des URLs Messenger/Instagram.
 */
export async function downloadImageFromMetaMessage(
  imageUrl: string,
  credentials: Record<string, string>
): Promise<{ data: string; mimeType: string } | null> {
  // Essayer d'abord sans token (certaines URLs sont publiques)
  let result = await downloadMetaImage(imageUrl);

  // Si ça échoue, essayer avec le token
  if (!result && credentials.accessToken) {
    result = await downloadMetaImage(imageUrl, credentials.accessToken);
  }

  // Si toujours pas, essayer avec le token WhatsApp
  if (!result && credentials.apiKey) {
    result = await downloadMetaImage(imageUrl, credentials.apiKey);
  }

  // Dernier recours : essayer via le proxy inverse (enlever les paramètres d'auth)
  if (!result) {
    const cleanUrl = imageUrl.split("?")[0];
    result = await downloadMetaImage(cleanUrl);
  }

  return result
    ? { data: result.data, mimeType: result.mimeType }
    : null;
}
