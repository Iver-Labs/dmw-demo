/**
 * Settings of the notebook's FINAL run (DaBig3_RAG_Final_Notebook.ipynb, copied from run R6),
 * as written to content/handoff/final_config.json. tests/notebook-parity.test.ts checks every
 * value here against that file, so the site can't drift from the notebook.
 *
 * RETRIEVAL_TOP_K (3) and RETRIEVAL_MIN_SCORE (0 = score gate off) stay env vars (lib/env.ts);
 * the test checks their defaults too.
 */

/** Results returned by each search (vector and BM25) before merging: `candidates`. */
export const CANDIDATES = 20;

/** Reciprocal Rank Fusion: score = weight / (RRF_K + rank) in every list a chunk appears in. */
export const RRF_K = 60;
export const VECTOR_WEIGHT = 1.0;
export const BM25_WEIGHT = 1.0;

/** rank_bm25 BM25Okapi defaults. */
export const BM25_K1 = 1.5;
export const BM25_B = 0.75;
export const BM25_EPSILON = 0.25;

export const TEMPERATURE = 0.0;
export const MAX_TOKENS = 400;

export const FALLBACK_TOKEN = "FALLBACK";
export const FALLBACK_MESSAGE =
  "I can't find that in my documents (the PEOS module and the DMW list of licensed agencies). / Paumanhin, wala ito sa mga dokumentong hawak ko.";

/** Recorded in index.meta.json as the chunker id. */
export const CHUNKER_ID = "notebook-handoff FINAL (R6): PEOS clean 800/200 + DMW 1 record/chunk";
export const HANDOFF_DIR = "content/handoff";
export const CHUNKS_FILE = `${HANDOFF_DIR}/chunks.jsonl`;
