export const SECTIONS = ["faq", "oec-bm", "directory", "contact"] as const;
export type Section = (typeof SECTIONS)[number];

/** One curated page from content/kb/<slug>.md. */
export interface KbDoc {
  slug: string;
  title: string;
  sourceUrl: string;
  section: Section;
  retrieved: string;
  body: string;
}

/** A retrievable piece of a KbDoc. `text` already carries its "title > heading" header. */
export interface Chunk {
  id: string;
  text: string;
  title: string;
  url: string;
  section: Section;
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

export interface ScoredChunk extends LoadedChunk {
  /** Raw cosine similarity; the retrieval gate uses this. */
  score: number;
  /** Score plus the acronym boost; ranking uses this. */
  rankScore: number;
}

export interface Source {
  n: number;
  title: string;
  url: string;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}
