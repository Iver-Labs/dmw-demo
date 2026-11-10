import { normalize } from "@/lib/rag/search";
import type { LoadedChunk, ScoredChunk, Section } from "@/lib/rag/types";

export function chunk(id: string, vector: number[], over: Partial<LoadedChunk> = {}): LoadedChunk {
  return {
    id,
    text: `Text of ${id}`,
    title: `Title ${id}`,
    url: `https://dmw.gov.ph/${id}`,
    section: "faq" as Section,
    vector: normalize(vector),
    ...over,
  };
}

export function scored(id: string, score = 0.8, over: Partial<LoadedChunk> = {}): ScoredChunk {
  return { ...chunk(id, [1, 0], over), score, rankScore: score };
}
