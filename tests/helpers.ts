import { makeIndex, type LoadedIndex } from "@/lib/rag/index-store";
import { normalize } from "@/lib/rag/search";
import type { LoadedChunk, RetrievedChunk } from "@/lib/rag/types";

export function chunk(id: string, vector: number[], over: Partial<LoadedChunk> = {}): LoadedChunk {
  return {
    id,
    source: "PEOS",
    page: 1,
    record_no: null,
    agency: null,
    text: `Text of ${id}`,
    vector: normalize(vector),
    ...over,
  };
}

export function retrieved(id: string, rank: number, over: Partial<LoadedChunk> = {}): RetrievedChunk {
  return { ...chunk(id, [1, 0], over), rank, vector_sim: 0.9, vector_rank: rank, bm25_rank: null, score: 0 };
}

export function index(chunks: LoadedChunk[]): LoadedIndex {
  return makeIndex(chunks, {
    embedModel: "m",
    dims: chunks[0]?.vector.length ?? 2,
    chunks: chunks.length,
    contentHash: "h",
    chunker: "c",
    builtAt: "t",
  });
}
