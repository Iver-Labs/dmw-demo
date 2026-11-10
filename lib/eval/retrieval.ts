/**
 * Retrieval scoring ported from the group's RAG notebook (DaBig3, Section 10:
 * normalize_for_match, phrase_found, units_in_chunk, score_retrieval, check_evidence_phrases).
 *
 * A question lists evidence units (U1, U2, …). Each unit has one or more phrases copied
 * exactly from the source. A phrase is a string, or an array of strings that must ALL appear
 * in the same chunk (the notebook's tuple, used for multi-field records). A unit is covered
 * when any one of its phrases is found in a chunk.
 */

export type EvidencePhrase = string | string[];
export type Evidence = Record<string, EvidencePhrase[]>;

export interface RetrievalScore {
  precision: number;
  recall: number;
  reciprocalRank: number;
  /** Units supported by each retrieved chunk, in rank order. */
  coveredPerRank: string[][];
}

const PUNCTUATION: Record<string, string> = {
  "‘": "'",
  "’": "'",
  "“": '"',
  "”": '"',
  "–": "-",
  "—": "-",
};

/** Ignore case, spacing (PDF text often has one word per line) and curly quotes / dashes. */
export function normalizeForMatch(text: string): string {
  let t = text.normalize("NFKC");
  for (const [from, to] of Object.entries(PUNCTUATION)) t = t.split(from).join(to);
  return t.replace(/\s+/g, " ").trim().toLowerCase();
}

export function phraseFound(phrase: EvidencePhrase, normalizedText: string): boolean {
  const parts = Array.isArray(phrase) ? phrase : [phrase];
  return parts.every((p) => normalizedText.includes(normalizeForMatch(p)));
}

/** The evidence units (U1, U2, …) that one chunk supports. */
export function unitsInChunk(chunkText: string, evidence: Evidence): string[] {
  const normalized = normalizeForMatch(chunkText);
  return Object.entries(evidence)
    .filter(([, phrases]) => phrases.some((p) => phraseFound(p, normalized)))
    .map(([unit]) => unit);
}

/**
 * Precision@k (relevant chunks / k), Recall@k (units covered / units) and reciprocal rank of
 * the first relevant chunk, over the first k retrieved chunks. Same formulas as the notebook.
 */
export function scoreRetrieval(retrievedTexts: string[], evidence: Evidence, k: number): RetrievalScore {
  const coveredPerRank = retrievedTexts.slice(0, k).map((t) => unitsInChunk(t, evidence));
  const relevant = coveredPerRank.map((units) => units.length > 0);
  const units = Object.keys(evidence);
  const covered = new Set(coveredPerRank.flat());
  const firstHit = relevant.indexOf(true);
  return {
    precision: k > 0 ? relevant.filter(Boolean).length / k : 0,
    recall: units.length > 0 ? covered.size / units.length : 0,
    reciprocalRank: firstHit === -1 ? 0 : 1 / (firstHit + 1),
    coveredPerRank,
  };
}

/**
 * Units whose phrases appear nowhere in the indexed text (a typo in the evidence, or the source
 * isn't ingested yet). Such questions can't be scored and are left out of the averages.
 */
export function missingUnits(evidence: Evidence, corpusTexts: string[]): string[] {
  const corpus = corpusTexts.map(normalizeForMatch);
  return Object.entries(evidence)
    .filter(([, phrases]) => !phrases.some((p) => corpus.some((text) => phraseFound(p, text))))
    .map(([unit]) => unit);
}

export const mean = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
