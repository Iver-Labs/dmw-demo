import { z } from "zod";

/**
 * Runtime configuration, read only from environment variables (Runtime contract).
 * Secrets are server-only: nothing here may ever be prefixed with NEXT_PUBLIC_.
 */
const bool = z.enum(["true", "false", "1", "0"]).transform((v) => v === "true" || v === "1");

const required = (name: string) =>
  z
    .string({ error: `${name} is required` })
    .trim()
    .min(1, `${name} is required`);

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  SEALION_API_KEY: required("SEALION_API_KEY"),
  // Embeddings run locally (lib/rag/embed.ts), so SEA-LION's is the only key.
  SEALION_BASE_URL: z.url().default("https://api.sea-lion.ai/v1"),
  SEALION_MODEL: required("SEALION_MODEL"),
  SEALION_THINKING_OFF: bool.default(true),
  EMBED_MODEL: required("EMBED_MODEL"),
  EMBED_DIMS: z.coerce.number().int().positive(),
  // 3 = top_k of the notebook's FINAL run (content/handoff/final_config.json).
  RETRIEVAL_TOP_K: z.coerce.number().int().min(1).max(20).default(3),
  // 0 = score gate off, as in the notebook's FINAL run (score_threshold: null).
  RETRIEVAL_MIN_SCORE: z.coerce.number().min(0).max(1).default(0),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  CHAT_RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(5),
  CHAT_MAX_INPUT_CHARS: z.coerce.number().int().positive().default(500),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  K_SERVICE: z.string().optional(),
  K_REVISION: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export type EnvResult =
  | { ok: true; env: Env }
  // Only variable names are reported, never values.
  | { ok: false; problems: string[] };

export function parseEnv(source: Record<string, string | undefined> = process.env): EnvResult {
  // Treat empty strings as unset so `KEY=` in .env.local reads as missing.
  const cleaned = Object.fromEntries(Object.entries(source).filter(([, v]) => v !== undefined && v !== ""));
  const result = envSchema.safeParse(cleaned);
  if (result.success) return { ok: true, env: result.data };
  const problems = result.error.issues.map((i) => {
    const key = i.path.join(".") || "(root)";
    return i.code === "invalid_type" ? `${key} is required` : `${key}: ${i.message}`;
  });
  return { ok: false, problems: [...new Set(problems)] };
}

let cached: Env | undefined;

/** The validated env. Throws (names only) if it is invalid; startup checks this first. */
export function getEnv(): Env {
  if (cached) return cached;
  const result = parseEnv();
  if (!result.ok) throw new Error(`Invalid environment: ${result.problems.join("; ")}`);
  cached = result.env;
  return cached;
}
