// ============================================================================
// HumenAI — Media Downloader
// Télécharge les images des canaux Meta (Messenger/Instagram/WhatsApp)
// et les convertit en base64 pour les passer directement aux providers IA.
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
