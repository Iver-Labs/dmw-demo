import type { LoadedChunk, ScoredChunk } from "./types";

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

export interface SearchOptions {
  topK: number;
  /** Glossary terms found in the query; chunks containing one get `boost` added for ranking. */
  acronyms?: string[];
  boost?: number;
}

export function search(
  query: Float32Array,
  chunks: LoadedChunk[],
  { topK, acronyms = [], boost = 0.03 }: SearchOptions,
): ScoredChunk[] {
  const res = acronyms.map((a) => new RegExp(`(?<![A-Za-z0-9-])${a}(?![A-Za-z0-9-])`));
  return chunks
    .map((c) => {
      const score = dot(query, c.vector);
      const hit = res.some((re) => re.test(c.text));
      return { ...c, score, rankScore: score + (hit ? boost : 0) };
    })
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, topK);
}
