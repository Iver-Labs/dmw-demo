/**
 * The site must run the notebook's FINAL pipeline (content/handoff/HANDOFF.md). These tests pin every
 * setting to the handoff files, so a change on either side fails here instead of drifting silently.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { envSchema } from "@/lib/env";
import { BM25Okapi, tokenize } from "@/lib/rag/bm25";
import { withPrefix } from "@/lib/rag/embed";
import * as NB from "@/lib/rag/notebook";
import { SITE_RULE_12, SYSTEM_PROMPT } from "@/lib/rag/prompt";

const handoff = (f: string) => readFileSync(`content/handoff/${f}`, "utf8");
const config = JSON.parse(handoff("final_config.json"));
const envDefaults = envSchema.parse({
  SEALION_API_KEY: "k",
  SEALION_MODEL: "m",
  EMBED_MODEL: "e",
  EMBED_DIMS: "384",
});
const envExample = Object.fromEntries(
  readFileSync(".env.example", "utf8")
    .split("\n")
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => l.split("=", 2) as [string, string]),
);

describe("notebook parity: final_config.json", () => {
  it("uses system_prompt.txt byte for byte, plus only the approved site rule 12", () => {
    const notebook = handoff("system_prompt.txt");
    const rule11 =
      "11. Do not include representative names, addresses or phone numbers unless the user asks for them.\n";
    expect(notebook).toContain(rule11);
    expect(SYSTEM_PROMPT).toBe(notebook.replace(rule11, `${rule11}${SITE_RULE_12}\n`));
  });

  it("matches the retrieval settings", () => {
    const r = config.retrieval;
    expect(r.mode).toBe("hybrid");
    expect(NB.CANDIDATES).toBe(r.candidates_per_search);
    expect(NB.RRF_K).toBe(r.rrf_k);
    expect(NB.VECTOR_WEIGHT).toBe(r.vector_weight);
    expect(NB.BM25_WEIGHT).toBe(r.bm25_weight);
    expect(r.bm25).toContain(`k1=${NB.BM25_K1}`);
    expect(r.bm25).toContain(`b=${NB.BM25_B}`);
    expect(envDefaults.RETRIEVAL_TOP_K).toBe(r.top_k);
    // score_threshold null = gate off = RETRIEVAL_MIN_SCORE 0
    expect(r.score_threshold).toBeNull();
    expect(envDefaults.RETRIEVAL_MIN_SCORE).toBe(0);
    expect(envExample.RETRIEVAL_MIN_SCORE).toBe("0");
    expect(envExample.RETRIEVAL_TOP_K ?? "3").toBe(String(r.top_k));
  });

  it("matches the generation settings", () => {
    const g = config.generation;
    expect(envExample.SEALION_MODEL).toBe(g.model);
    expect(envDefaults.SEALION_BASE_URL).toBe(g.base_url);
    expect(NB.TEMPERATURE).toBe(g.temperature);
    expect(NB.MAX_TOKENS).toBe(g.max_tokens);
    expect(NB.FALLBACK_TOKEN).toBe(g.fallback_token);
    expect(NB.FALLBACK_MESSAGE).toBe(g.fallback_message);
    expect(g.require_citation).toBe(false);
    // the notebook sends no chat_template_kwargs
    expect(envExample.SEALION_THINKING_OFF).toBe("false");
  });

  it("matches the embedding settings", () => {
    const e = config.embedding;
    expect(envExample.EMBED_MODEL).toBe(e.transformersjs_model);
    expect(Number(envExample.EMBED_DIMS)).toBe(e.dims);
    expect(withPrefix("x", "RETRIEVAL_QUERY", e.transformersjs_model)).toBe(`${e.query_prefix}x`);
    expect(withPrefix("x", "RETRIEVAL_DOCUMENT", e.transformersjs_model)).toBe(`${e.doc_prefix}x`);
  });

  it("indexes exactly the notebook's chunks", () => {
    const meta = JSON.parse(readFileSync("data/index.meta.json", "utf8"));
    expect(meta.chunks).toBe(config.chunking.total_chunks);
    expect(meta.chunker).toBe(NB.CHUNKER_ID);
    expect(meta.embedModel).toBe(config.embedding.transformersjs_model);
  });
});

describe("notebook parity: BM25", () => {
  it("tokenizes like re.findall(r'\\w+', NFKC(text).lower())", () => {
    expect(tokenize("RECORD 1 - Agency: 101 MOJO INT`L. CORPORATION")).toEqual([
      "record",
      "1",
      "agency",
      "101",
      "mojo",
      "int",
      "l",
      "corporation",
    ]);
    expect(tokenize("Hanggang kailan valid ang OEC? 2-month")).toEqual([
      "hanggang",
      "kailan",
      "valid",
      "ang",
      "oec",
      "2",
      "month",
    ]);
    expect(tokenize("ﬁle USD15,000.00 snake_case")).toEqual(["file", "usd15", "000", "00", "snake_case"]);
  });

  it("scores exactly like rank_bm25 0.2.2 BM25Okapi", () => {
    // Expected values computed with rank_bm25 0.2.2 + numpy on the same corpus and query.
    const corpus = [
      "The OEC has a 2-month validity.",
      "OEC OEC exemption for Balik-Manggagawa",
      "Placement fee: one month basic salary",
      "RECORD 1 - Agency: 101 MOJO",
    ].map(tokenize);
    const scores = Array.from(new BM25Okapi(corpus).getScores(tokenize("oec validity mojo")));
    expect(scores).toEqual([0.7881840561741429, 0, 0, 0.9159976869050851]);
  });
});
