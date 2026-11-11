import type { Env } from "../env";
import { embedQuery } from "./embed";
import { fallbackSources } from "./fallback";
import type { LoadedIndex } from "./index-store";
import { FALLBACK_MESSAGE, FALLBACK_TOKEN } from "./notebook";
import { buildMessages, sourceLabel, type PromptMessage } from "./prompt";
import { chatCompletion } from "./sealion";
import { retrieve } from "./search";
import type { Source } from "./types";

export type FallbackReason = "gate" | "model" | "empty";

export interface AnswerResult {
  answer: string;
  sources: Source[];
  fallback: boolean;
  /** Log/eval fields; never sent to the browser. */
  meta: {
    top_score: number;
    gated: boolean;
    fallback_reason?: FallbackReason;
    /** Chunk ids in rank order (compared with the notebook's notebook_retrieved_ids). */
    retrieved_ids: string[];
    /** Citation numbers found in the answer, and whether one points at a retrieved passage. */
    cited: number[];
    valid_citation: boolean;
    llm_called: boolean;
    /** Embed + search time, and SEA-LION time (0 when no call was made). */
    retrieval_ms: number;
    generation_ms: number;
  };
}

/** Network calls, injectable so the pipeline is testable without API keys. */
export interface AnswerDeps {
  embed: (text: string) => Promise<Float32Array>;
  chat: (messages: PromptMessage[]) => Promise<string>;
}

export function defaultDeps(env: Env): AnswerDeps {
  return {
    embed: (text) => embedQuery(text, { model: env.EMBED_MODEL, dims: env.EMBED_DIMS }),
    chat: (messages) =>
      chatCompletion(messages, {
        baseUrl: env.SEALION_BASE_URL,
        apiKey: env.SEALION_API_KEY,
        model: env.SEALION_MODEL,
        thinkingOff: env.SEALION_THINKING_OFF,
        timeoutMs: env.LLM_TIMEOUT_MS,
      }),
  };
}

type AnswerConfig = Pick<Env, "RETRIEVAL_TOP_K" | "RETRIEVAL_MIN_SCORE">;

const CITATION_RE = /\[(\d+)\]/g;

/**
 * The notebook's answer_question(): hybrid retrieval → optional score gate (off: RETRIEVAL_MIN_SCORE=0)
 * → one SEA-LION call → a reply starting with FALLBACK (or, on the site only, an empty reply) becomes
 * the fixed fallback message.
 * require_citation is False in the final config, so uncited answers are kept. Each question is answered
 * on its own: no conversation history. Upstream errors propagate.
 */
export async function answerQuestion(
  question: string,
  index: LoadedIndex,
  cfg: AnswerConfig,
  deps: AnswerDeps,
): Promise<AnswerResult> {
  const t0 = performance.now();
  const qvec = await deps.embed(question);
  const { retrieved, top_vector_sim } = retrieve(
    qvec,
    question,
    index.chunks,
    index.bm25,
    cfg.RETRIEVAL_TOP_K,
  );
  const retrieval_ms = Math.round(performance.now() - t0);

  const gated = cfg.RETRIEVAL_MIN_SCORE > 0 && top_vector_sim < cfg.RETRIEVAL_MIN_SCORE;
  let raw = "";
  let generation_ms = 0;
  if (!gated) {
    const t1 = performance.now();
    raw = await deps.chat(buildMessages(question, retrieved));
    generation_ms = Math.round(performance.now() - t1);
  }

  const fallbackToken = raw.trim().toUpperCase().startsWith(FALLBACK_TOKEN);
  // Site addition (owner-approved 2026-11-11): an empty reply shows the fallback message, not a blank answer.
  const empty = !gated && raw.trim() === "";
  const answer = gated || fallbackToken || empty ? FALLBACK_MESSAGE : raw;
  const cited = [...new Set([...answer.matchAll(CITATION_RE)].map((m) => Number(m[1])))].sort(
    (a, b) => a - b,
  );
  const valid_citation = cited.some((n) => n >= 1 && n <= retrieved.length);
  const fallback = answer === FALLBACK_MESSAGE;

  return {
    answer,
    // The retrieved passages in rank order, so the [n] markers in the answer match the list.
    sources: fallback ? fallbackSources() : retrieved.map((c) => ({ n: c.rank, title: sourceLabel(c) })),
    fallback,
    meta: {
      top_score: round(top_vector_sim),
      gated,
      ...(fallback && { fallback_reason: gated ? "gate" : empty ? "empty" : "model" }),
      retrieved_ids: retrieved.map((c) => c.id),
      cited,
      valid_citation,
      llm_called: !gated,
      retrieval_ms,
      generation_ms,
    },
  };
}

const round = (n: number) => Math.round(n * 1000) / 1000;
