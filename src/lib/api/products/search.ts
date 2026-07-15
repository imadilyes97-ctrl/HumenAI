// ============================================================================
// HumenAI — Product Search
// Cherche les produits dans le catalogue RAG à partir d'une description
// ============================================================================

import { getSupabaseAdminClient } from "@/lib/supabase/client";

export interface ProductResult {
  id: string;
  name: string;
  content: string;
  price: number;
  currency: string;
  compareAtPrice: number | null;
  imageUrl: string | null;
  category: string;
  tags: string[];
  stockQuantity: number;
  similarity: number;
}

/**
 * Cherche des produits dans le catalogue RAG du tenant.
 * Utilise la recherche sémantique (pgvector) ou textuelle (ILIRE).
 */
export async function searchProducts(
  tenantId: string,
  query: string,
  options?: { limit?: number; minSimilarity?: number }
): Promise<ProductResult[]> {
  const supabase = getSupabaseAdminClient();
  const limit = options?.limit || 10;

  // Recherche textuelle ILIRE sur les documents produits
  try {
    const { data: docs } = await supabase
      .from("documents")
      .select("id, title, content, metadata")
      .eq("tenant_id", tenantId)
      .eq("source_type", "product")
      .eq("active", true)
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (docs && docs.length > 0) {
      return docs.map((d) => {
        const meta = (d.metadata || {}) as Record<string, unknown>;
        return {
          id: d.id,
          name: ((d.title as string) || "").replace(/^📦 /, ""),
          content: d.content as string,
          price: (meta.price as number) || 0,
          currency: (meta.currency as string) || "DZD",
          compareAtPrice: (meta.compare_at_price as number | null) || null,
          imageUrl: (meta.image_url as string | null) || null,
          category: (meta.category as string) || "",
          tags: (meta.tags as string[]) || [],
          stockQuantity: (meta.stock_quantity as number) || -1,
          similarity: 0,
        };
      });
    }
  } catch {
    // Fallback échoué
  }

  return [];
}

/**
 * Génère un bloc de contexte produits pour le system prompt.
 */
export function buildProductContext(products: ProductResult[]): string {
  if (products.length === 0) return "";

  const lines = products.map(
    (p, i) =>
      `[Produit ${i + 1}] ${p.name}
   Prix: ${p.price.toFixed(2)} ${p.currency}${p.compareAtPrice ? ` (promo: ${p.compareAtPrice.toFixed(2)})` : ""}${p.category ? ` | Catégorie: ${p.category}` : ""}${p.imageUrl ? ` | Image: ${p.imageUrl}` : ""}${p.stockQuantity === 0 ? " | ⚠️ RUPTURE DE STOCK" : ""}${p.stockQuantity > 0 && p.stockQuantity <= 5 ? ` | ⚠️ Plus que ${p.stockQuantity} en stock` : ""}`
  );

  return `\n\n## PRODUITS TROUVÉS DANS LE CATALOGUE\n${lines.join("\n")}\n\nPrésente ces produits au client de façon naturelle, comme un vrai vendeur. Donne les prix, les infos importantes, et fais des suggestions.`;
}
