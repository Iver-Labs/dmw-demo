import type { ScoredChunk, Source } from "./types";

export const MAX_SOURCES = 3;

export interface CitationResult {
  answer: string;
  sources: Source[];
  /** False when no valid citation survived: the caller must swap in the fallback. */
  grounded: boolean;
}

/**
 * Map the model's [n] markers to the numbered context chunks. Numbers that don't exist are
 * dropped; chunks sharing a URL collapse into one source; the rest are renumbered 1..k in
 * first-cited order so the text markers match the source chips. At most MAX_SOURCES.
 */
export function applyCitations(answer: string, context: ScoredChunk[]): CitationResult {
  const byUrl = new Map<string, Source>();
  const markerRe = /\[(\d+(?:\s*,\s*\d+)*)\]/g;

  const rewritten = answer.replace(markerRe, (_m, list: string) => {
    const nums: number[] = [];
    for (const raw of list.split(",")) {
      const chunk = context[Number(raw.trim()) - 1];
      if (!chunk) continue;
      let src = byUrl.get(chunk.url);
      if (!src) {
        if (byUrl.size >= MAX_SOURCES) continue;
        src = { n: byUrl.size + 1, title: chunk.title, url: chunk.url };
        byUrl.set(chunk.url, src);
      }
      if (!nums.includes(src.n)) nums.push(src.n);
    }
    return nums.map((n) => `[${n}]`).join("");
  });

  // Adjacent markers can now repeat ("[1][3]" → "[2][2]" when 1 and 3 share a URL): keep each once.
  const deduped = rewritten.replace(/(?:\[\d+\])+/g, (run) => [...new Set(run.match(/\[\d+\]/g))].join(""));

  const sources = [...byUrl.values()];
  return {
    answer: deduped
      .replace(/[ \t]+([.,;:!?])/g, "$1")
      .replace(/[ \t]{2,}/g, " ")
      .trim(),
    sources,
    grounded: sources.length > 0,
  };
}
