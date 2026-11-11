import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

const valid = {
  SEALION_API_KEY: "sk-secret-value",
  SEALION_MODEL: "aisingapore/Llama-SEA-LION-v3.5-70B-R",
  EMBED_MODEL: "Xenova/multilingual-e5-small",
  EMBED_DIMS: "384",
};

describe("parseEnv", () => {
  it("applies defaults and coerces numbers and booleans", () => {
    const r = parseEnv({ ...valid, SEALION_THINKING_OFF: "false" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.env.EMBED_DIMS).toBe(384);
    expect(r.env.RETRIEVAL_TOP_K).toBe(3);
    expect(r.env.RETRIEVAL_MIN_SCORE).toBe(0);
    expect(r.env.SEALION_THINKING_OFF).toBe(false);
    expect(r.env.SEALION_BASE_URL).toBe("https://api.sea-lion.ai/v1");
  });

  it("treats empty values as missing and reports names only, never values", () => {
    const r = parseEnv({ ...valid, SEALION_API_KEY: "", EMBED_MODEL: undefined });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.problems).toContain("SEALION_API_KEY is required");
    expect(r.problems).toContain("EMBED_MODEL is required");
    expect(JSON.stringify(r.problems)).not.toContain("secret");
  });

  it("no longer needs a Gemini key (embeddings run locally)", () => {
    expect(parseEnv(valid).ok).toBe(true);
  });

  it("rejects out-of-range tuning values", () => {
    const r = parseEnv({ ...valid, RETRIEVAL_MIN_SCORE: "1.5" });
    expect(r.ok).toBe(false);
  });
});
