import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { BM25Okapi, tokenize } from "./bm25";
import { normalize } from "./search";
import type { IndexMeta, LoadedChunk } from "./types";

export const INDEX_FILE = "data/index.json";
export const META_FILE = "data/index.meta.json";

const metaSchema = z.object({
  embedModel: z.string().min(1),
  dims: z.number().int().positive(),
  chunks: z.number().int().nonnegative(),
  contentHash: z.string().min(1),
  chunker: z.string().min(1),
  builtAt: z.string().min(1),
});

/** Fields of content/handoff/chunks.jsonl, as written by the notebook (Section 15.1). */
export const chunkSchema = z.object({
  id: z.string(),
  source: z.enum(["PEOS", "DMW"]),
  page: z.number().int().positive(),
  record_no: z.number().int().positive().nullable(),
  agency: z.string().nullable(),
  text: z.string(),
});

const indexedChunkSchema = chunkSchema.extend({ vector: z.array(z.number()) });

export interface LoadedIndex {
  chunks: LoadedChunk[];
  meta: IndexMeta;
  /** BM25 over the same chunks, built at load time (the notebook builds it with the index). */
  bm25: BM25Okapi;
}

/** Build the in-memory index from chunks; also used by tests. */
export function makeIndex(chunks: LoadedChunk[], meta: IndexMeta): LoadedIndex {
  return { chunks, meta, bm25: new BM25Okapi(chunks.map((c) => tokenize(c.text))) };
}

export async function loadIndex(root = process.cwd()): Promise<LoadedIndex> {
  const [rawIndex, rawMeta] = await Promise.all([
    readFile(path.join(root, INDEX_FILE), "utf8"),
    readFile(path.join(root, META_FILE), "utf8"),
  ]);
  const meta = metaSchema.parse(JSON.parse(rawMeta));
  const entries = z.array(indexedChunkSchema).parse(JSON.parse(rawIndex));
  if (entries.length !== meta.chunks)
    throw new Error(`index has ${entries.length} chunks but meta says ${meta.chunks}`);
  const chunks = entries.map((e) => {
    if (e.vector.length !== meta.dims)
      throw new Error(`chunk ${e.id} has ${e.vector.length} dims, meta says ${meta.dims}`);
    return { ...e, vector: normalize(e.vector) };
  });
  return makeIndex(chunks, meta);
}

/** Null when the index matches the runtime config, else the reason it can't be searched. */
export function indexMismatch(
  meta: IndexMeta,
  env: { EMBED_MODEL: string; EMBED_DIMS: number },
): string | null {
  if (meta.embedModel !== env.EMBED_MODEL)
    return `EMBED_MODEL is ${env.EMBED_MODEL} but the index was built with ${meta.embedModel}`;
  if (meta.dims !== env.EMBED_DIMS)
    return `EMBED_DIMS is ${env.EMBED_DIMS} but the index was built with ${meta.dims}`;
  return null;
}

/* ---------- process-wide state, shared by instrumentation and route handlers ---------- */

export type IndexState =
  { status: "starting" } | { status: "ready"; index: LoadedIndex } | { status: "failed"; reason: string };

const KEY = Symbol.for("dmw-demo.index-state");
type Holder = { [KEY]?: IndexState };

export function getIndexState(): IndexState {
  return (globalThis as Holder)[KEY] ?? { status: "starting" };
}

export function setIndexState(state: IndexState): void {
  (globalThis as Holder)[KEY] = state;
}

/** The ready index; throws if startup didn't complete. */
export function requireIndex(): LoadedIndex {
  const s = getIndexState();
  if (s.status !== "ready") throw new Error(`index not ready (${s.status})`);
  return s.index;
}
