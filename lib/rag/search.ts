import { tokenize, type BM25Okapi } from "./bm25";
import { BM25_WEIGHT, CANDIDATES, RRF_K, VECTOR_WEIGHT } from "./notebook";
import type { LoadedChunk, RetrievedChunk } from "./types";

export function normalize(v: ArrayLike<number>): Float32Array {
  const out = Float32Array.from(v);
  let sum = 0;
  for (let i = 0; i < out.length; i++) sum += out[i] * out[i];
  const norm = Math.sqrt(sum);
  if (norm > 0) for (let i = 0; i < out.length; i++) out[i] /= norm;
  return out;
}

/** Dot product; equals cosine similarity because every vector is stored unit-length. */
export function dot(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) throw new Error(`dimension mismatch: ${a.length} vs ${b.length}`);
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/**
 * Indices of the `n` highest scores, highest first: numpy's np.argsort(scores)[::-1][:n].
 * Equal scores come out highest index first, as the reverse of an ascending stable sort.
 */
export function argsortDesc(scores: ArrayLike<number>, n: number): number[] {
  const idx = Array.from({ length: scores.length }, (_, i) => i);
  idx.sort((a, b) => scores[b] - scores[a] || b - a);
  return idx.slice(0, n);
}

export interface RetrieveResult {
  retrieved: RetrievedChunk[];
  /** Best vector similarity (the notebook's top_vector_sim, used by the optional score gate). */
  top_vector_sim: number;
}

/**
 * The notebook's retrieve() in "hybrid" mode: a vector search and a BM25 keyword search each
 * return their top CANDIDATES chunks; Reciprocal Rank Fusion merges them and the top `k` are kept.
 * The vector search is exact cosine (the notebook used Chroma's approximate HNSW index).
 */
export function retrieve(
  qvec: Float32Array,
  question: string,
  chunks: LoadedChunk[],
  bm25: BM25Okapi,
  k: number,
): RetrieveResult {
  const n = Math.max(CANDIDATES, k);

  // Vector search: top n by cosine similarity.
  const sims = chunks.map((c) => dot(qvec, c.vector));
  const vectorRanked = argsortDesc(sims, n).map((i) => [chunks[i].id, sims[i]] as const);
  const vectorRank = new Map(vectorRanked.map(([id], r) => [id, r + 1]));
  const vectorSim = new Map(vectorRanked);

  // BM25: top n with score > 0.
  const scores = bm25.getScores(tokenize(question));
  const bm25Ids = argsortDesc(scores, n)
    .filter((i) => scores[i] > 0)
    .map((i) => chunks[i].id);
  const bm25Rank = new Map(bm25Ids.map((id, r) => [id, r + 1]));

  // RRF. Insertion order (vector list, then BM25-only ids) breaks ties, as Python's stable sorted().
  const merged = new Map<string, number>();
  for (const [id, r] of vectorRank) merged.set(id, (merged.get(id) ?? 0) + VECTOR_WEIGHT / (RRF_K + r));
  for (const [id, r] of bm25Rank) merged.set(id, (merged.get(id) ?? 0) + BM25_WEIGHT / (RRF_K + r));
  const topIds = [...merged.keys()].sort((a, b) => merged.get(b)! - merged.get(a)!).slice(0, k);

  const byId = new Map(chunks.map((c) => [c.id, c]));
  return {
    retrieved: topIds.map((id, i) => ({
      ...byId.get(id)!,
      rank: i + 1,
      vector_sim: vectorSim.get(id) ?? null,
      vector_rank: vectorRank.get(id) ?? null,
      bm25_rank: bm25Rank.get(id) ?? null,
      score: merged.get(id)!,
    })),
    top_vector_sim: vectorRanked.length ? vectorRanked[0][1] : 0,
  };
}
