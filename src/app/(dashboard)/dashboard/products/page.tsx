"use client";

import { useState, useEffect, useRef } from "react";

interface Product {
  id: string;
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
  is_active: boolean;
  created_at: string;
}

const CURRENCIES = ["DZD", "EUR", "USD", "GBP", "MAD", "TND"];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formComparePrice, setFormComparePrice] = useState("");
  const [formCurrency, setFormCurrency] = useState("DZD");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formTags, setFormTags] = useState("");
  const [formStock, setFormStock] = useState("-1");

  useEffect(() => { loadProducts(); }, []);

  async function loadProducts(q?: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      const res = await fetch(`/api/products?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setTotal(data.total || 0);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    loadProducts(search || undefined);
  }

  function openAddForm() {
    setEditing(null);
    setFormName(""); setFormDescription(""); setFormPrice(""); setFormComparePrice("");
    setFormCurrency("DZD"); setFormImageUrl(""); setFormCategory(""); setFormTags(""); setFormStock("-1");
    setShowForm(true);
  }

  function openEditForm(product: Product) {
    setEditing(product);
    setFormName(product.name);
    setFormDescription(product.description.replace(/^.*💰.*\n.*🏷️.*\n/, "").trim());
    setFormPrice(String(product.price));
    setFormComparePrice(product.compare_at_price ? String(product.compare_at_price) : "");
    setFormCurrency(product.currency);
    setFormImageUrl(product.image_url || "");
    setFormCategory(product.category);
    setFormTags(product.tags.join(", "));
    setFormStock(String(product.stock_quantity));
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setFeedback(null);

    const body = {
      id: editing?.id,
      name: formName,
      description: formDescription,
      price: parseFloat(formPrice) || 0,
      currency: formCurrency,
      compare_at_price: formComparePrice ? parseFloat(formComparePrice) : null,
      image_url: formImageUrl || null,
      category: formCategory,
      tags: formTags.split(",").map((t) => t.trim()).filter(Boolean),
      stock_quantity: parseInt(formStock) || -1,
    };

    try {
      const res = await fetch("/api/products", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: "success", message: data.message });
        setShowForm(false);
        loadProducts(search || undefined);
      } else {
        setFeedback({ type: "error", message: data.error || "Erreur" });
      }
    } catch {
      setFeedback({ type: "error", message: "Erreur réseau" });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce produit ?")) return;
    try {
      const res = await fetch(`/api/products?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setFeedback({ type: "success", message: "✅ Produit supprimé" });
        loadProducts(search || undefined);
      }
    } catch { /* silent */ }
  }

  return (
    <div className="max-w-4xl space-y-6 pb-12">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📦 Catalogue Produits</h1>
          <p className="text-sm text-text-secondary mt-1">
            {total > 0
              ? `${total} produit${total > 1 ? "s" : ""} — le chatbot connaît automatiquement votre catalogue`
              : "Ajoutez vos produits pour que le chatbot puisse les présenter aux clients"}
          </p>
        </div>
        <button
          onClick={openAddForm}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700 transition-colors text-sm flex items-center gap-1.5"
        >
          + Ajouter un produit
        </button>
      </div>

      {/* SEARCH */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un produit..."
          className="flex-1 px-3 py-2 border border-border rounded-lg text-sm"
        />
        <button type="submit" className="px-4 py-2 bg-surface-secondary border border-border rounded-lg text-sm font-medium hover:bg-gray-100">
          🔍
        </button>
      </form>

      {/* FEEDBACK */}
      {feedback && (
        <div className={`p-3 rounded-xl text-sm ${
          feedback.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {feedback.message}
        </div>
      )}

      {/* FORM */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-border p-6 space-y-4">
          <h2 className="font-semibold text-lg">{editing ? "✏️ Modifier le produit" : "➕ Nouveau produit"}</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Nom du produit *</label>
              <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm" placeholder="Ex: T-shirt premium coton" required />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Prix *</label>
              <input type="number" step="0.01" min="0" value={formPrice} onChange={(e) => setFormPrice(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm" placeholder="9999.00" required />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Prix barré (promo)</label>
                <input type="number" step="0.01" min="0" value={formComparePrice} onChange={(e) => setFormComparePrice(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm" placeholder="12999.00" />
              </div>
              <div className="w-24">
                <label className="block text-sm font-medium mb-1">Devise</label>
                <select value={formCurrency} onChange={(e) => setFormCurrency(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm">
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Catégorie</label>
              <input type="text" value={formCategory} onChange={(e) => setFormCategory(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm" placeholder="Ex: Vêtements, Électronique" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Stock</label>
              <input type="number" min="-1" value={formStock} onChange={(e) => setFormStock(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm" placeholder="-1 = illimité" />
              <p className="text-xs text-text-secondary mt-0.5">-1 = illimité</p>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">URL de l&apos;image (optionnel)</label>
              <input type="url" value={formImageUrl} onChange={(e) => setFormImageUrl(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm" placeholder="https://..." />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Tags (séparés par des virgules)</label>
              <input type="text" value={formTags} onChange={(e) => setFormTags(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm" placeholder="Ex: promo, nouveau, best-seller" />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-none" rows={3}
                placeholder="Description du produit..." />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={saving || !formName || !formPrice}
              className="bg-brand-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 text-sm">
              {saving ? "💾..." : editing ? "💾 Mettre à jour" : "💾 Ajouter"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-6 py-2 border border-border rounded-lg text-sm font-medium hover:bg-surface-secondary">
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* PRODUCT LIST */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-text-secondary">Chargement du catalogue...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-border">
          <p className="text-5xl mb-4">📦</p>
          <h3 className="text-lg font-semibold mb-2">Catalogue vide</h3>
          <p className="text-sm text-text-secondary mb-4">
            Ajoutez vos produits pour que le chatbot puisse les présenter aux clients
          </p>
          <button onClick={openAddForm}
            className="bg-brand-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-brand-700 transition-colors text-sm">
            + Ajouter un produit
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {products.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-border p-4 flex gap-4 hover:border-brand-200 transition-colors">
              {/* Image placeholder */}
              <div className="w-20 h-20 rounded-lg bg-surface-secondary flex items-center justify-center shrink-0 text-2xl">
                {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover rounded-lg" /> : "📦"}
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium text-sm">{p.name}</h3>
                    {p.category && <span className="text-xs text-text-secondary">{p.category}</span>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-brand-600">
                      {p.price.toFixed(2)} <span className="text-xs">{p.currency}</span>
                    </p>
                    {p.compare_at_price && p.compare_at_price > p.price && (
                      <p className="text-xs text-red-500 line-through">{p.compare_at_price.toFixed(2)} {p.currency}</p>
                    )}
                  </div>
                </div>

                {p.description && (
                  <p className="text-xs text-text-secondary mt-1 line-clamp-2">{p.description.split("\n").pop() || p.description}</p>
                )}

                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {p.source === "manual" && <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Manuel</span>}
                  {p.stock_quantity === 0 && <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">Rupture</span>}
                  {p.stock_quantity > 0 && p.stock_quantity <= 5 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">{p.stock_quantity} restants</span>
                  )}
                  {p.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-xs px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">#{tag.trim()}</span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1 shrink-0">
                <button onClick={() => openEditForm(p)}
                  className="text-xs px-2 py-1 rounded border border-border hover:bg-surface-secondary">✏️</button>
                <button onClick={() => handleDelete(p.id)}
                  className="text-xs px-2 py-1 rounded border border-red-200 text-red-500 hover:bg-red-50">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
