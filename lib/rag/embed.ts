import { normalize } from "./search";

/** Gemini embeddings over REST (gemini-embedding-001). Keeps SEA-LION's 10 req/min for chat. */
const BASE = "https://generativelanguage.googleapis.com/v1beta";
const MAX_BATCH = 100;

export type TaskType = "RETRIEVAL_QUERY" | "RETRIEVAL_DOCUMENT";

export interface EmbedConfig {
  apiKey: string;
  model: string;
  dims: number;
  timeoutMs?: number;
}

export class EmbedError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "EmbedError";
  }
}

/** Embed up to 100 texts in one request. Vectors come back unit-length (required below 3072 dims). */
export async function embedBatch(
  texts: string[],
  taskType: TaskType,
  { apiKey, model, dims, timeoutMs = 15_000 }: EmbedConfig,
): Promise<Float32Array[]> {
  if (texts.length === 0) return [];
  if (texts.length > MAX_BATCH) throw new EmbedError(`batch too large (${texts.length} > ${MAX_BATCH})`);
  const res = await fetch(`${BASE}/models/${model}:batchEmbedContents`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      requests: texts.map((text) => ({
        model: `models/${model}`,
        content: { parts: [{ text }] },
        taskType,
        outputDimensionality: dims,
      })),
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new EmbedError(`Gemini embeddings returned HTTP ${res.status}`, res.status);
  const json = (await res.json()) as { embeddings?: { values: number[] }[] };
  const vectors = json.embeddings ?? [];
  if (vectors.length !== texts.length)
    throw new EmbedError(`expected ${texts.length} embeddings, got ${vectors.length}`);
  return vectors.map((e) => {
    if (e.values.length !== dims) throw new EmbedError(`expected ${dims} dims, got ${e.values.length}`);
    return normalize(e.values);
  });
}

export async function embedQuery(text: string, cfg: EmbedConfig): Promise<Float32Array> {
  const [v] = await embedBatch([text], "RETRIEVAL_QUERY", cfg);
  return v;
}
