// ============================================================================
// HumenAI — Products API
// Stocke les produits dans la table documents (source_type = 'product')
// pour intégration RAG automatique.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/client";
import { getApiTenantId } from "@/lib/api-utils";
import { generateEmbedding } from "@/lib/rag/embedding";

export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  compare_at_price: number | null;
  image_url: string | null;
  category: string;
  tags: string[];
  stock_quantity: number;
  source: string;
  source_id: string | null;
  is_active: boolean;
  created_at: string;
}

// GET /api/products
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient();
    const tenantId = await getApiTenantId(request);
    if (!tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category");
    const query = searchParams.get("q");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 200);
    const offset = parseInt(searchParams.get("offset") || "0");

    let dbQuery = supabase
      .from("documents")
      .select("*", { count: "exact" })
      .eq("tenant_id", tenantId)
      .eq("source_type", "product")
      .eq("chunk_index", 0); // un document par produit

    if (category) dbQuery = dbQuery.eq("metadata->>category", category);
    if (query) dbQuery = dbQuery.ilike("title", `%${query}%`);

    const { data: docs, error, count } = await dbQuery
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Products GET error:", error);
      return NextResponse.json({ error: "Erreur de récupération" }, { status: 500 });
    }

    const products = (docs || []).map(docToProduct);
    return NextResponse.json({ products, total: count || 0 });
  } catch (error) {
    console.error("Products GET error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/products
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient();
    const tenantId = await getApiTenantId(request);
    if (!tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await request.json();
    const { name, description, price, currency, compare_at_price, image_url, category, tags, stock_quantity } = body;
    if (!name || price === undefined) return NextResponse.json({ error: "Nom et prix requis" }, { status: 400 });

    const metadata = {
      price: parseFloat(price),
      currency: currency || "DZD",
      compare_at_price: compare_at_price ? parseFloat(compare_at_price) : null,
      image_url: image_url || null,
      category: category || "",
      tags: tags || [],
      stock_quantity: stock_quantity !== undefined ? stock_quantity : -1,
      source: "manual",
      is_active: true,
    };

    const productContent = `📦 ${name}
💰 Prix: ${parseFloat(price).toFixed(2)} ${currency || "DZD"}${compare_at_price ? ` (au lieu de ${parseFloat(compare_at_price).toFixed(2)})` : ""}
${category ? `🏷️ Catégorie: ${category}` : ""}
${description || "Pas de description"}`;

    const { data: product, error } = await supabase
      .from("documents")
      .insert({
        tenant_id: tenantId,
        title: `📦 ${name}`,
        content: productContent,
        source_type: "product",
        chunk_index: 0,
        total_chunks: 1,
        metadata,
        active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Products POST error:", error);
      return NextResponse.json({ error: "Erreur de création" }, { status: 500 });
    }

    // Générer l'embedding pour que le chatbot trouve ce produit via RAG
    try {
      const embedding = await generateEmbedding(productContent);
      if (embedding) {
        await supabase.from("documents").update({ embedding }).eq("id", product.id);
      }
    } catch (e) {
      console.warn("Embedding generation failed for product:", e);
    }

    return NextResponse.json({ product: docToProduct(product), message: "✅ Produit ajouté !" }, { status: 201 });
  } catch (error) {
    console.error("Products POST error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PUT /api/products
export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient();
    const tenantId = await getApiTenantId(request);
    if (!tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await request.json();
    const { id, name, description, price, currency, compare_at_price, image_url, category, tags, stock_quantity, is_active } = body;
    if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

    // Récupérer les metadonnées existantes
    const { data: existing } = await supabase
      .from("documents")
      .select("id, title, metadata")
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .single();

    if (!existing) return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });

    const meta = existing.metadata as Record<string, unknown>;
    if (price !== undefined) meta.price = parseFloat(price);
    if (currency !== undefined) meta.currency = currency;
    if (compare_at_price !== undefined) meta.compare_at_price = compare_at_price ? parseFloat(compare_at_price) : null;
    if (image_url !== undefined) meta.image_url = image_url;
    if (category !== undefined) meta.category = category;
    if (tags !== undefined) meta.tags = tags;
    if (stock_quantity !== undefined) meta.stock_quantity = stock_quantity;
    if (is_active !== undefined) meta.is_active = is_active;

    const finalName = name || existing.title.replace(/^📦 /, "");
    const finalPrice = (meta.price as number) || 0;
    const finalCurrency = (meta.currency as string) || "DZD";
    const finalCompareAt = meta.compare_at_price as number | null;
    const finalCategory = (meta.category as string) || "";
    const finalDescription = description || "";
    const content = `📦 ${finalName}
💰 Prix: ${finalPrice.toFixed(2)} ${finalCurrency}${finalCompareAt ? ` (au lieu de ${finalCompareAt.toFixed(2)})` : ""}
${finalCategory ? `🏷️ Catégorie: ${finalCategory}` : ""}
${finalDescription || "Pas de description"}`;

    const { data: product, error } = await supabase
      .from("documents")
      .update({
        title: name ? `📦 ${name}` : existing.title,
        content,
        metadata: meta as never,
        ...(is_active !== undefined ? { active: is_active } : {}),
      })
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .select()
      .single();

    if (error) {
      console.error("Products PUT error:", error);
      return NextResponse.json({ error: "Erreur de mise à jour" }, { status: 500 });
    }

    // Regénérer l'embedding
    try {
      const embedding = await generateEmbedding(content);
      if (embedding) {
        await supabase.from("documents").update({ embedding }).eq("id", id);
      }
    } catch { /* silent */ }

    return NextResponse.json({ product: docToProduct(product), message: "✅ Produit mis à jour" });
  } catch (error) {
    console.error("Products PUT error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE /api/products
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient();
    const tenantId = await getApiTenantId(request);
    if (!tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

    const { error } = await supabase
      .from("documents")
      .update({ active: false })
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .eq("source_type", "product");

    if (error) {
      console.error("Products DELETE error:", error);
      return NextResponse.json({ error: "Erreur de suppression" }, { status: 500 });
    }

    return NextResponse.json({ message: "✅ Produit supprimé" });
  } catch (error) {
    console.error("Products DELETE error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

function docToProduct(doc: Record<string, unknown>): Product {
  const meta = (doc.metadata || {}) as Record<string, unknown>;
  return {
    id: doc.id as string,
    tenant_id: doc.tenant_id as string,
    name: (doc.title as string || "").replace(/^📦 /, ""),
    description: (doc.content as string || ""),
    price: (meta.price as number) || 0,
    currency: (meta.currency as string) || "DZD",
    compare_at_price: (meta.compare_at_price as number | null) || null,
    image_url: (meta.image_url as string | null) || null,
    category: (meta.category as string) || "",
    tags: (meta.tags as string[]) || [],
    stock_quantity: (meta.stock_quantity as number) || -1,
    source: (meta.source as string) || "manual",
    source_id: (meta.source_id as string | null) || null,
    is_active: (meta.is_active as boolean) !== false,
    created_at: doc.created_at as string,
  };
}
