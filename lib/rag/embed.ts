import path from "node:path";
import { normalize } from "./search";

/**
 * Local sentence embeddings with Transformers.js: multilingual-e5-small (384 dims, mean pooling,
 * normalized). No API key and no network call: the weights are fetched and checksum-verified into
 * models/ by `npm run model:fetch` (also run in the Docker build), and runtime downloads are disabled.
 *
 * e5 is multilingual (XLM-R tokenizer; Tagalog is in its training data), replacing the English-only
 * all-MiniLM-L6-v2 that scored Filipino questions low. It expects "query: " / "passage: " prefixes;
 * leaving them out costs retrieval quality. Inputs are truncated at 512 tokens.
 */

export type TaskType = "RETRIEVAL_QUERY" | "RETRIEVAL_DOCUMENT";

/** Per-model input prefixes; models not listed (e.g. MiniLM) encode text as-is. */
const PREFIXES: Record<string, Record<TaskType, string>> = {
  "Xenova/multilingual-e5-small": { RETRIEVAL_QUERY: "query: ", RETRIEVAL_DOCUMENT: "passage: " },
};

export function withPrefix(text: string, taskType: TaskType, model: string): string {
  return (PREFIXES[model]?.[taskType] ?? "") + text;
}

export interface EmbedConfig {
  model: string;
  dims: number;
  /** Folder holding <model>/ (default: <cwd>/models). */
  modelDir?: string;
}

export class EmbedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmbedError";
  }
}

export const MODEL_DIR = "models";
/** Texts per forward pass; bounds memory during ingest. */
const MAX_BATCH = 32;

type Extractor = (
  texts: string[],
  options: { pooling: "mean"; normalize: boolean },
) => Promise<{ tolist(): unknown }>;

/* One loaded model per process (survives hot reloads in dev). */
const G = globalThis as { __dmwEmbedders?: Map<string, Promise<Extractor>> };
const loaded = (G.__dmwEmbedders ??= new Map());

function getExtractor({ model, modelDir }: EmbedConfig): Promise<Extractor> {
  const dir = modelDir ?? path.join(process.cwd(), MODEL_DIR);
  const key = `${dir}::${model}`;
  let extractor = loaded.get(key);
  if (!extractor) {
    extractor = (async () => {
      const { env, pipeline } = await import("@huggingface/transformers");
      env.allowRemoteModels = false; // weights ship with the build; never download at runtime
      env.allowLocalModels = true;
      env.localModelPath = dir + path.sep;
      env.useFSCache = false; // the container filesystem is read-only
      // fp32 = onnx/model.onnx, the notebook's precision (sentence-transformers on PyTorch).
      const pipe = await pipeline("feature-extraction", model, { dtype: "fp32", device: "cpu" });
      return pipe as unknown as Extractor;
    })().catch((err) => {
      loaded.delete(key);
      throw new EmbedError(
        `could not load embedding model ${model} from ${dir} (run npm run model:fetch): ${err instanceof Error ? err.message : err}`,
      );
    });
    loaded.set(key, extractor);
  }
  return extractor;
}

/** Embed texts locally; vectors come back unit-length with `dims` values each. */
export async function embedBatch(
  texts: string[],
  taskType: TaskType,
  cfg: EmbedConfig,
): Promise<Float32Array[]> {
  if (texts.length === 0) return [];
  const extractor = await getExtractor(cfg);
  const inputs = texts.map((t) => withPrefix(t, taskType, cfg.model));
  const vectors: Float32Array[] = [];
  for (let i = 0; i < inputs.length; i += MAX_BATCH) {
    const output = (
      await extractor(inputs.slice(i, i + MAX_BATCH), { pooling: "mean", normalize: true })
    ).tolist();
    for (const v of output as number[][]) {
      if (v.length !== cfg.dims) throw new EmbedError(`expected ${cfg.dims} dims, got ${v.length}`);
      vectors.push(normalize(v));
    }
  }
  return vectors;
}

export async function embedQuery(text: string, cfg: EmbedConfig): Promise<Float32Array> {
  const [v] = await embedBatch([text], "RETRIEVAL_QUERY", cfg);
  return v;
}
