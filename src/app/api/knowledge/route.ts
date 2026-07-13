// ============================================================================
// HumenAI — Knowledge Base API
// Upload, list, and manage documents for RAG-powered chatbot responses
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getSupabaseAdminClient } from "@/lib/supabase/client";
import { processDocument } from "@/lib/rag/embedding";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DocumentInfo {
  id: string;
  title: string;
  content: string;
  sourceUrl: string | null;
  sourceType: string;
  version: number;
  chunkCount: number;
  processedAt: string;
}

// ---------------------------------------------------------------------------
// GET — Liste tous les documents du tenant (groupés par titre)
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient(request);
    const tenantId = request.headers.get("x-tenant-id");

    if (!tenantId) {
      return NextResponse.json({ error: "x-tenant-id requis" }, { status: 400 });
    }

    // Récupérer les documents groupés par titre (un document = plusieurs chunks)
    const { data: docs, error } = await supabase
      .from("documents")
      .select("id, document_group_id, title, content, chunk_index, total_chunks, source_url, source_type, version, active, created_at, metadata")
      .eq("tenant_id", tenantId)
      .eq("active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[knowledge] Erreur liste documents:", error);
      return NextResponse.json({ error: "Erreur de récupération" }, { status: 500 });
    }

    // Grouper par document_group_id
    const grouped = new Map<string, DocumentInfo>();
    for (const doc of docs || []) {
      const groupId = doc.document_group_id || doc.id;
      if (!grouped.has(groupId)) {
        // Extraire le titre sans le suffixe de chunk
        const title = doc.title;
        const metadata = doc.metadata as Record<string, unknown> | null;
        const originalName = (metadata?.originalFileName as string) || title;

        grouped.set(groupId, {
          id: groupId,
          title: originalName,
          sourceUrl: doc.source_url,
          sourceType: doc.source_type,
          version: doc.version,
          chunkCount: doc.total_chunks || 1,
          processedAt: doc.created_at,
          content: doc.content ? `${doc.content.slice(0, 150)}...` : "",
        });
      }
    }

    return NextResponse.json({
      documents: Array.from(grouped.values()),
      total: grouped.size,
    });
  } catch (error) {
    console.error("[knowledge] GET error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST — Upload un document et lance le pipeline RAG
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient(request);
    const tenantId = request.headers.get("x-tenant-id");

    if (!tenantId) {
      return NextResponse.json({ error: "x-tenant-id requis" }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
    }

    // Validation taille
    const maxSize = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Fichier trop volumineux. Maximum 10 MB." },
        { status: 413 }
      );
    }

    // Validation type
    const allowedTypes = ["text/plain", "text/markdown", "application/pdf", "text/csv", "application/json", "text/html"];
    const ext = file.name.split(".").pop()?.toLowerCase();
    const allowedExts = ["txt", "md", "pdf", "csv", "json", "html"];

    if (!allowedTypes.includes(file.type) && !allowedExts.includes(ext || "")) {
      return NextResponse.json(
        { error: "Format non supporté. Formats acceptés : PDF, TXT, MD, CSV, JSON, HTML" },
        { status: 400 }
      );
    }

    console.log(`[knowledge] Upload: ${file.name} (${(file.size / 1024).toFixed(1)} KB, ${file.type})`);

    // Lire le contenu du fichier
    let content = "";
    const buffer = Buffer.from(await file.arrayBuffer());

    // Pour les PDFs on extrait le texte (simple fallback)
    if (file.type === "application/pdf" || ext === "pdf") {
      content = buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\s]/g, " ").slice(0, 100000);
    } else {
      content = buffer.toString("utf-8");
    }

    // Nettoyage basique
    content = content
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\n{4,}/g, "\n\n\n")
      .trim();

    if (content.length < 10) {
      return NextResponse.json(
        { error: "Le fichier est vide ou illisible. Essayez un format TXT ou MD." },
        { status: 400 }
      );
    }

    // Pipeline RAG complet
    const documentGroupId = await processDocument(
      {
        tenantId,
        title: file.name,
        content,
        sourceType: "import",
        metadata: {
          originalFileName: file.name,
          fileType: ext,
          tokenCount: Math.ceil(content.length / 4),
        },
      },
      { type: "fixed", chunkSize: 1000, overlap: 200 }
    );

    console.log(`[knowledge] ✅ ${file.name} traité — ${documentGroupId}`);

    return NextResponse.json({
      message: `"${file.name}" importé avec succès !`,
      documentGroupId,
      chunksCount: Math.ceil(content.length / 800),
    });
  } catch (error) {
    console.error("[knowledge] POST error:", error);
    const message = error instanceof Error ? error.message : "Erreur lors de l'import";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE — Supprime un document (tous ses chunks)
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient(request);
    const tenantId = request.headers.get("x-tenant-id");
    const id = request.nextUrl.searchParams.get("id");

    if (!tenantId) {
      return NextResponse.json({ error: "x-tenant-id requis" }, { status: 400 });
    }

    if (!id) {
      return NextResponse.json({ error: "ID du document requis" }, { status: 400 });
    }

    // Supprimer tous les chunks du groupe
    const { error } = await supabase
      .from("documents")
      .update({ active: false })
      .eq("tenant_id", tenantId)
      .eq("document_group_id", id);

    if (error) {
      console.error("[knowledge] DELETE error:", error);
      return NextResponse.json({ error: "Erreur de suppression" }, { status: 500 });
    }

    return NextResponse.json({ message: "Document supprimé" });
  } catch (error) {
    console.error("[knowledge] DELETE error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
