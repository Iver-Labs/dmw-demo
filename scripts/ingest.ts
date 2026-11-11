/**
 * npm run ingest — content/handoff/chunks.jsonl (the notebook's FINAL chunks, NOT re-chunked)
 * → local multilingual-e5-small embeddings ("passage: " prefix) → data/index.json + index.meta.json.
 * Run it outside Docker, then commit content/handoff and both data files together.
 * Needs EMBED_MODEL and EMBED_DIMS (read from .env.local) and the model in models/
 * (`npm run ingest` fetches and verifies it first). No API key.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { embedBatch } from "../lib/rag/embed";
import { chunkSchema, INDEX_FILE, META_FILE } from "../lib/rag/index-store";
import { CHUNKER_ID, CHUNKS_FILE, HANDOFF_DIR } from "../lib/rag/notebook";
import type { Chunk, IndexedChunk, IndexMeta } from "../lib/rag/types";
import { contentHash } from "./lib/content-hash.mjs"; // shared with check-index

const BATCH = 256; // progress-report granularity; embed.ts runs 32 texts per forward pass

function need(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) {
    console.error(`ingest: ${name} is not set (copy .env.example to .env.local and fill it in)`);
    process.exit(1);
  }
  return v;
}

function loadChunks(): Chunk[] {
  const lines = readFileSync(CHUNKS_FILE, "utf8")
    .split("\n")
    .filter((l) => l.trim());
  const chunks = lines.map((l, i) => {
    try {
      return chunkSchema.parse(JSON.parse(l));
    } catch (err) {
      throw new Error(`${CHUNKS_FILE} line ${i + 1}: ${err instanceof Error ? err.message : err}`);
    }
  });
  const config = JSON.parse(readFileSync(`${HANDOFF_DIR}/final_config.json`, "utf8"));
  const expected = config.chunking.total_chunks;
  if (chunks.length !== expected)
    throw new Error(`${CHUNKS_FILE} has ${chunks.length} chunks; final_config.json says ${expected}`);
  if (new Set(chunks.map((c) => c.id)).size !== chunks.length)
    throw new Error(`${CHUNKS_FILE} has duplicate ids`);
  return chunks;
}

async function main() {
  const model = need("EMBED_MODEL");
  const dims = Number(need("EMBED_DIMS"));

  const chunks = loadChunks();
  console.log(
    `ingest: ${chunks.length} notebook chunks from ${CHUNKS_FILE}; embedding with ${model}/${dims}`,
  );

  const indexed: IndexedChunk[] = [];
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    const vectors = await embedBatch(
      batch.map((c) => c.text),
      "RETRIEVAL_DOCUMENT",
      { model, dims },
    );
    batch.forEach((c, j) =>
      indexed.push({ ...c, vector: Array.from(vectors[j], (x) => Math.round(x * 1e6) / 1e6) }),
    );
    console.log(`ingest: embedded ${Math.min(i + BATCH, chunks.length)}/${chunks.length}`);
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
  console.log(`ingest: wrote ${INDEX_FILE} and ${META_FILE}. Commit them with ${HANDOFF_DIR}.`);
}

main().catch((err) => {
  console.error(`ingest failed: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
