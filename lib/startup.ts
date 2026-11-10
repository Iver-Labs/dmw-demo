import { parseEnv } from "./env";
import { log } from "./log";
import { indexMismatch, loadIndex, setIndexState } from "./rag/index-store";

/**
 * Runs once when the server starts (from instrumentation.ts):
 * validate env → load data/index.json → compare with index.meta.json → mark ready.
 *
 * In production any failure exits 1, so a bad Cloud Run revision never goes live.
 * In development it logs and keeps serving pages, so you can build the site before
 * you have API keys or an index; /api/health stays 503 until both are in place.
 */
export async function startup(): Promise<void> {
  const strict = process.env.NODE_ENV === "production";
  const fail = (message: string, fields: Record<string, unknown>) => {
    setIndexState({ status: "failed", reason: message });
    log.error(message, fields);
    if (strict) process.exit(1);
    log.warn("Startup check failed; continuing because NODE_ENV is not production", {});
  };

  const envResult = parseEnv();
  if (!envResult.ok) return fail("Invalid environment", { problems: envResult.problems });
  const env = envResult.env;

  let index;
  try {
    index = await loadIndex();
  } catch (err) {
    return fail("Knowledge index failed to load: run npm run ingest", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const mismatch = indexMismatch(index.meta, env);
  if (mismatch) return fail(`Index mismatch: ${mismatch}`, {});

  setIndexState({ status: "ready", index });
  log.info("Ready", {
    chunks: index.chunks.length,
    model: env.SEALION_MODEL,
    embedModel: index.meta.embedModel,
    indexBuiltAt: index.meta.builtAt,
  });
}
