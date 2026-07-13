// ============================================================================
// HumenAI — RAG Embedding Service
// Document chunking, embedding generation, and pgvector similarity search
// ============================================================================

import { getSupabaseAdminClient } from "@/lib/supabase/client";
import type { DocumentSearchResult, ChunkingStrategy } from "@/lib/db/types";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";
const OPENAI_EMBEDDING_DIMENSIONS = 1536;
const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;

// ---------------------------------------------------------------------------
// Text chunking
// ---------------------------------------------------------------------------

/**
 * Splits text into overlapping chunks for embedding.
 */
export function chunkText(
  text: string,
  strategy: ChunkingStrategy = {
    type: "fixed",
    chunkSize: DEFAULT_CHUNK_SIZE,
    overlap: DEFAULT_CHUNK_OVERLAP,
  }
): string[] {
  switch (strategy.type) {
    case "paragraph":
      return chunkByParagraph(text);
    case "semantic":
      return chunkBySemanticBoundary(text, strategy.maxChunkSize);
    case "fixed":
    default:
      return chunkByFixedSize(text, strategy.chunkSize, strategy.overlap);
  }
}

function chunkByFixedSize(
  text: string,
  chunkSize: number,
  overlap: number
): string[] {
  if (text.length <= chunkSize) return [text];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);

    // Try to break at a sentence boundary
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf(". ", end);
      const lastNewline = text.lastIndexOf("\n\n", end);
      const breakPoint = Math.max(lastPeriod, lastNewline);

      if (breakPoint > start) {
        chunks.push(text.slice(start, breakPoint + 1).trim());
        start = breakPoint + 1 - overlap;
      } else {
        chunks.push(text.slice(start, end).trim());
        start = end - overlap;
      }
    } else {
      chunks.push(text.slice(start).trim());
      start = end;
    }

    // Prevent infinite loop on tiny overlap
    if (start >= text.length - overlap && start < text.length) {
      chunks.push(text.slice(start).trim());
      break;
    }
  }

  return chunks.filter((c) => c.length > 0);
}

function chunkByParagraph(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

function chunkBySemanticBoundary(
  text: string,
  maxChunkSize: number
): string[] {
  const paragraphs = chunkByParagraph(text);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if ((current + "\n\n" + para).length <= maxChunkSize) {
      current += (current ? "\n\n" : "") + para;
    } else {
      if (current) chunks.push(current);
      current = para;
    }
  }
  if (current) chunks.push(current);

  return chunks;
}

// ---------------------------------------------------------------------------
// Embedding generation
// ---------------------------------------------------------------------------

/**
 * Generates an embedding vector for a text string using OpenAI's API.
 */
export async function generateEmbedding(
  text: string
): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const response = await fetch(
    "https://api.openai.com/v1/embeddings",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_EMBEDDING_MODEL,
        input: text,
        dimensions: OPENAI_EMBEDDING_DIMENSIONS,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI embedding error: ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Generates embeddings for multiple texts (batch).
 */
export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const response = await fetch(
    "https://api.openai.com/v1/embeddings",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_EMBEDDING_MODEL,
        input: texts,
        dimensions: OPENAI_EMBEDDING_DIMENSIONS,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI batch embedding error: ${error}`);
  }

  const data = await response.json();
  return data.data
    .sort((a: { index: number }, b: { index: number }) => a.index - b.index)
    .map((d: { embedding: number[] }) => d.embedding);
}

// ---------------------------------------------------------------------------
// Document processing pipeline
// ---------------------------------------------------------------------------

export interface ProcessDocumentInput {
  tenantId: string;
  title: string;
  content: string;
  sourceUrl?: string | null;
  sourceType?: "manual" | "import" | "web_scrape" | "api" | "integration";
}

/**
 * Processes a document end-to-end:
 * 1. Chunks the text
 * 2. Generates embeddings for each chunk
 * 3. Stores chunks + embeddings in the documents table
 * 4. Returns the document group ID for tracking
 */
export async function processDocument(
  input: ProcessDocumentInput,
  strategy: ChunkingStrategy = {
    type: "fixed",
    chunkSize: DEFAULT_CHUNK_SIZE,
    overlap: DEFAULT_CHUNK_OVERLAP,
  }
): Promise<string> {
  const supabase = getSupabaseAdminClient();
  const chunks = chunkText(input.content, strategy);

  // Generate all embeddings in parallel
  const embeddings = await generateEmbeddings(chunks);

  // Create a document_group_id to link all chunks
  const documentGroupId = crypto.randomUUID();

  // Calculate the next version number
  const { data: existing } = await supabase
    .from("documents")
    .select("version")
    .eq("tenant_id", input.tenantId)
    .eq("title", input.title)
    .order("version", { ascending: false })
    .limit(1);

  const version = existing && existing.length > 0
    ? existing[0].version + 1
    : 1;

  // Insert all chunks
  const rows = chunks.map((chunk, index) => ({
    tenant_id: input.tenantId,
    document_group_id: documentGroupId,
    title: input.title,
    content: chunk,
    chunk_index: index,
    total_chunks: chunks.length,
    embedding: embeddings[index],
    source_url: input.sourceUrl ?? null,
    source_type: input.sourceType ?? "manual",
    version,
    active: true,
    metadata: {
      tokenCount: Math.ceil(chunk.length / 4), // approximate
      originalFileName: input.title,
    },
  }));

  const { error } = await supabase.from("documents").insert(rows);

  if (error) {
    throw new Error(`Failed to insert document chunks: ${error.message}`);
  }

  return documentGroupId;
}

// ---------------------------------------------------------------------------
// Semantic search
// ---------------------------------------------------------------------------

/**
 * Searches documents by semantic similarity to a query.
 * Uses pgvector's cosine similarity operator (<->) via the Supabase RPC.
 */
export async function searchDocuments(
  tenantId: string,
  query: string,
  options: {
    limit?: number;
    minSimilarity?: number;
    activeOnly?: boolean;
  } = {}
): Promise<DocumentSearchResult[]> {
  const supabase = getSupabaseAdminClient();
  const {
    limit = 5,
    minSimilarity = 0.7,
    activeOnly = true,
  } = options;

  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);

  // Format as pgvector string
  const embeddingStr = `[${queryEmbedding.join(",")}]`;

  // Use a raw SQL query for vector similarity search
  // Supabase-js supports .rpc() for this
  const { data, error } = await supabase.rpc("search_documents", {
    p_tenant_id: tenantId,
    p_embedding: embeddingStr,
    p_match_threshold: minSimilarity,
    p_match_count: limit,
    p_active_only: activeOnly,
  });

  if (error) {
    throw new Error(`Vector search failed: ${error.message}`);
  }

  return (data ?? []).map(
    (row: {
      id: string;
      tenant_id: string;
      document_group_id: string | null;
      title: string;
      content: string;
      chunk_index: number;
      total_chunks: number;
      source_url: string | null;
      source_type: string;
      version: number;
      active: boolean;
      metadata: Record<string, unknown>;
      created_at: string;
      updated_at: string;
      similarity: number;
    }) => ({
      chunk: {
        id: row.id,
        tenantId: row.tenant_id,
        documentGroupId: row.document_group_id,
        title: row.title,
        content: row.content,
        chunkIndex: row.chunk_index,
        totalChunks: row.total_chunks,
        embedding: null,
        sourceUrl: row.source_url,
        sourceType: row.source_type as DocumentSearchResult["chunk"]["sourceType"],
        version: row.version,
        active: row.active,
        metadata: row.metadata as DocumentSearchResult["chunk"]["metadata"],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
      similarity: row.similarity,
      tenantId: row.tenant_id,
    })
  );
}
