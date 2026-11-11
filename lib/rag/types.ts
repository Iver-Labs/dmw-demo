export const SECTIONS = ["faq", "oec-bm", "guides", "directory", "contact"] as const;
export type Section = (typeof SECTIONS)[number];

/** One curated page from content/kb/<slug>.md (rendered by the site pages; not used by the chatbot). */
export interface KbDoc {
  slug: string;
  title: string;
  sourceUrl: string;
  section: Section;
  retrieved: string;
  body: string;
  /** Optional per-file window size/overlap (characters) for long sections; defaults in chunk.ts. */
  chunkSize?: number;
  chunkOverlap?: number;
}

/**
 * One chunk from the notebook handoff (content/handoff/chunks.jsonl), embedded as-is:
 * the notebook's FINAL index (PEOS clean 800/200, one DMW record per chunk).
 */
export interface Chunk {
  id: string;
  source: "PEOS" | "DMW";
  page: number;
  record_no: number | null;
  agency: string | null;
  text: string;
}

/** Shape of each entry in data/index.json. */
export interface IndexedChunk extends Chunk {
  vector: number[];
}

/** In-memory form: vectors as unit-length Float32Array. */
export interface LoadedChunk extends Chunk {
  vector: Float32Array;
}

/** data/index.meta.json, written by `npm run ingest`. */
export interface IndexMeta {
  embedModel: string;
  dims: number;
  chunks: number;
  contentHash: string;
  chunker: string;
  builtAt: string;
}

/** One retrieved chunk with the fields the notebook's retrieve() records. */
export interface RetrievedChunk extends LoadedChunk {
  rank: number;
  vector_sim: number | null;
  vector_rank: number | null;
  bm25_rank: number | null;
  /** Merged RRF score (hybrid) or vector similarity (vector mode). */
  score: number;
}

export interface Source {
  n: number;
  title: string;
  /** Absent for the notebook's passages (the chunks carry no URL), present for the fallback link. */
  url?: string;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}
