import { z } from "zod";
import { parseEnv } from "@/lib/env";
import { log } from "@/lib/log";
import { clientKey, RateLimiter } from "@/lib/rate-limit";
import { answerQuestion, defaultDeps, type AnswerResult } from "@/lib/rag/answer";
import { BUSY_TEXT } from "@/lib/rag/fallback";
import { getIndexState } from "@/lib/rag/index-store";
import { UpstreamError } from "@/lib/rag/sealion";
import { SUGGESTED_QUESTIONS } from "@/lib/site";

const ROUTE = "/api/chat";

const bodySchema = z.object({
  message: z.string().trim().min(1),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) }))
    .max(4)
    .default([]),
});

/* Per-instance state (survives across requests within one Cloud Run instance). */
const G = globalThis as { __dmwLimiter?: RateLimiter; __dmwSuggested?: Map<string, AnswerResult> };
const suggestedCache = (G.__dmwSuggested ??= new Map());
const suggested = new Set<string>(SUGGESTED_QUESTIONS.map((q) => normalizeQ(q)));

function normalizeQ(q: string) {
  return q.trim().toLowerCase().replace(/\s+/g, " ");
}

const json = (body: unknown, status = 200) => Response.json(body, { status });

export async function POST(req: Request) {
  const started = performance.now();
  const done = (status: number, body: unknown, fields: Record<string, unknown> = {}) => {
    log.info("chat", {
      route: ROUTE,
      status,
      latency_ms: Math.round(performance.now() - started),
      ...fields,
    });
    return json(body, status);
  };

  const envResult = parseEnv();
  const state = getIndexState();
  if (!envResult.ok || state.status !== "ready")
    return done(503, { error: "The assistant isn't available right now." }, { reason: "not_ready" });
  const env = envResult.env;

  if (!req.headers.get("content-type")?.includes("application/json"))
    return done(415, { error: "Send JSON." });

  const limiter = (G.__dmwLimiter ??= new RateLimiter(env.CHAT_RATE_LIMIT_PER_MIN));
  if (!limiter.check(clientKey(req.headers)))
    return done(429, { error: BUSY_TEXT }, { reason: "rate_limited" });

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return done(400, { error: "Invalid request." });
  }
  if (body.message.length > env.CHAT_MAX_INPUT_CHARS)
    return done(400, { error: `Please keep questions under ${env.CHAT_MAX_INPUT_CHARS} characters.` });

  // Suggested questions with no history are answered once per instance, then served from memory.
  const key = normalizeQ(body.message);
  const cacheable = body.history.length === 0 && suggested.has(key);
  const cached = cacheable ? suggestedCache.get(key) : undefined;

  try {
    const result =
      cached ?? (await answerQuestion(body.message, body.history, state.index, env, defaultDeps(env)));
    if (cacheable && !cached) suggestedCache.set(key, result);
    return done(
      200,
      { answer: result.answer, sources: result.sources, fallback: result.fallback },
      {
        model: env.SEALION_MODEL,
        top_score: result.meta.top_score,
        gated: result.meta.gated,
        fallback_reason: result.meta.fallback_reason,
        sources_count: result.sources.length,
        // Stage timings of the original (uncached) answer.
        retrieval_ms: result.meta.retrieval_ms,
        generation_ms: result.meta.generation_ms,
        cached: Boolean(cached),
      },
    );
  } catch (err) {
    const upstream_status = err instanceof UpstreamError ? err.status : undefined;
    if (upstream_status === 429)
      return done(429, { error: BUSY_TEXT }, { upstream_status, model: env.SEALION_MODEL });
    log.warn("chat upstream failure", {
      route: ROUTE,
      upstream_status,
      error: err instanceof Error ? err.name : "unknown",
    });
    return done(502, { error: "Something went wrong. Please try again." }, { upstream_status });
  }
}
