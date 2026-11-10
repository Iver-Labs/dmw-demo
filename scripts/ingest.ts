/**
 * npm run ingest — content/kb/*.md → chunks → Gemini embeddings → data/index.json + index.meta.json.
 * Run it outside Docker, then commit the content and both data files together.
 * Needs GEMINI_API_KEY, EMBED_MODEL and EMBED_DIMS (read from .env.local).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { CHUNKER_ID, chunkDoc } from "../lib/rag/chunk";
import { embedBatch } from "../lib/rag/embed";
import { INDEX_FILE, META_FILE } from "../lib/rag/index-store";
import { loadKbDocs } from "../lib/rag/kb";
import type { IndexedChunk, IndexMeta } from "../lib/rag/types";
import { contentHash } from "./lib/content-hash.mjs"; // shared with check-index

const BATCH = 50;
const PAUSE_MS = 1_000; // stay well inside the free tier's per-minute limits

function need(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) {
    console.error(`ingest: ${name} is not set (copy .env.example to .env.local and fill it in)`);
    process.exit(1);
  }
  return v;
}

async function main() {
  const apiKey = need("GEMINI_API_KEY");
  const model = need("EMBED_MODEL");
  const dims = Number(need("EMBED_DIMS"));

  const docs = loadKbDocs();
  if (docs.length === 0) {
    console.error("ingest: content/kb has no .md files yet (see content/README.md)");
    process.exit(1);
  }
  const chunks = docs.flatMap(chunkDoc);
  console.log(`ingest: ${docs.length} docs → ${chunks.length} chunks; embedding with ${model}/${dims}`);

  const indexed: IndexedChunk[] = [];
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    const vectors = await embedBatch(
      batch.map((c) => c.text),
      "RETRIEVAL_DOCUMENT",
      { apiKey, model, dims, timeoutMs: 60_000 },
    );
    batch.forEach((c, j) =>
      indexed.push({ ...c, vector: Array.from(vectors[j], (x) => Math.round(x * 1e6) / 1e6) }),
    );
    console.log(`ingest: embedded ${Math.min(i + BATCH, chunks.length)}/${chunks.length}`);
    if (i + BATCH < chunks.length) await new Promise((r) => setTimeout(r, PAUSE_MS));
  }

  const meta: IndexMeta = {
    embedModel: model,
    dims,
    chunks: indexed.length,
    contentHash: contentHash(),
    chunker: CHUNKER_ID,
    builtAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
  };
  mkdirSync("data", { recursive: true });
  writeFileSync(INDEX_FILE, JSON.stringify(indexed));
  writeFileSync(META_FILE, JSON.stringify(meta, null, 2) + "\n");
  console.log(`ingest: wrote ${INDEX_FILE} and ${META_FILE}. Commit them with the content.`);
}

main().catch((err) => {
  console.error(`ingest failed: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
