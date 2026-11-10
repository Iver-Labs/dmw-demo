import type { Env } from "../env";
import { applyCitations } from "./citations";
import { embedQuery } from "./embed";
import { fallbackSources, FALLBACK_TEXT } from "./fallback";
import { expandQuery, findAcronyms } from "./glossary";
import type { LoadedIndex } from "./index-store";
import { buildMessages, FALLBACK_TOKEN, maxContextChunks, type PromptMessage } from "./prompt";
import { chatCompletion } from "./sealion";
import { search } from "./search";
import type { ChatTurn, Source } from "./types";

export type FallbackReason = "gate" | "model" | "ungrounded";

export interface AnswerResult {
  answer: string;
  sources: Source[];
  fallback: boolean;
  /** Log/eval fields; never sent to the browser. */
  meta: {
    top_score: number;
    gated: boolean;
    fallback_reason?: FallbackReason;
    retrieved_urls: string[];
    /** Chunk ids in rank order (eval scores Precision/Recall@k and MRR against these). */
    retrieved_ids: string[];
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

type AnswerConfig = Pick<Env, "SEALION_MODEL" | "RETRIEVAL_TOP_K" | "RETRIEVAL_MIN_SCORE">;

/**
 * retrieve → gate → SEA-LION (at most one call) → citation check.
 * "I don't know" has three layers: the score gate, the model's FALLBACK token, and
 * dropping any answer left with no valid citation. Upstream errors propagate.
 */
export async function answerQuestion(
  question: string,
  history: ChatTurn[],
  index: LoadedIndex,
  cfg: AnswerConfig,
  deps: AnswerDeps,
): Promise<AnswerResult> {
  // Follow-ups: embed the current message with the previous user message.
  const prevUser = [...history].reverse().find((t) => t.role === "user")?.content;
  const retrievalText = prevUser ? `${prevUser}\n${question}` : question;

  const t0 = performance.now();
  const qvec = await deps.embed(expandQuery(retrievalText));
  const k = maxContextChunks(cfg.SEALION_MODEL, cfg.RETRIEVAL_TOP_K);
  const results = search(qvec, index.chunks, { topK: k, acronyms: findAcronyms(retrievalText) });
  const retrieval_ms = Math.round(performance.now() - t0);
  const top = results.reduce((m, r) => Math.max(m, r.score), 0);
  const base = {
    top_score: round(top),
    retrieved_urls: [...new Set(results.map((r) => r.url))],
    retrieved_ids: results.map((r) => r.id),
    retrieval_ms,
  };

  const fallback = (reason: FallbackReason, llm_called: boolean, generation_ms = 0): AnswerResult => ({
    answer: FALLBACK_TEXT,
    sources: fallbackSources(index.chunks),
    fallback: true,
    meta: { ...base, gated: reason === "gate", fallback_reason: reason, llm_called, generation_ms },
  });

  if (results.length === 0 || top < cfg.RETRIEVAL_MIN_SCORE) return fallback("gate", false);

  const t1 = performance.now();
  const raw = await deps.chat(buildMessages(cfg.SEALION_MODEL, results, question, history));
  const generation_ms = Math.round(performance.now() - t1);
  if (!raw || raw.trim().replace(/[.\s]/g, "").toUpperCase().startsWith(FALLBACK_TOKEN))
    return fallback("model", true, generation_ms);

  const cited = applyCitations(raw, results);
  if (!cited.grounded) return fallback("ungrounded", true, generation_ms);

  return {
    answer: cited.answer,
    sources: cited.sources,
    fallback: false,
    meta: { ...base, gated: false, llm_called: true, generation_ms },
  };
}

const round = (n: number) => Math.round(n * 1000) / 1000;
