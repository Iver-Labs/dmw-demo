import { describe, expect, it } from "vitest";
import { answerQuestion, type AnswerDeps } from "@/lib/rag/answer";
import { withPrefix } from "@/lib/rag/embed";
import { FALLBACK_TEXT } from "@/lib/rag/fallback";
import { indexMismatch } from "@/lib/rag/index-store";
import { FALLBACK_MESSAGE } from "@/lib/rag/notebook";
import { buildMessages, formatContext, SYSTEM_PROMPT } from "@/lib/rag/prompt";
import { argsortDesc, normalize, retrieve } from "@/lib/rag/search";
import { chunk, index, retrieved } from "./helpers";

describe("withPrefix", () => {
  it("adds e5's query/passage prefixes and leaves other models alone", () => {
    const e5 = "Xenova/multilingual-e5-small";
    expect(withPrefix("Ano ang PRICEST?", "RETRIEVAL_QUERY", e5)).toBe("query: Ano ang PRICEST?");
    expect(withPrefix("OEC validity", "RETRIEVAL_DOCUMENT", e5)).toBe("passage: OEC validity");
    expect(withPrefix("OEC validity", "RETRIEVAL_QUERY", "Xenova/all-MiniLM-L6-v2")).toBe("OEC validity");
  });
});

describe("argsortDesc", () => {
  it("orders highest first, equal scores highest index first (reverse of a stable ascending sort)", () => {
    expect(argsortDesc([0.1, 0.5, 0.5, 0.9], 4)).toEqual([3, 2, 1, 0]);
    expect(argsortDesc([3, 1, 2], 2)).toEqual([0, 2]);
  });
});

describe("retrieve (hybrid, RRF)", () => {
  const idx = index([
    chunk("PEOS-00000", [1, 0], { text: "OEC validity is 2 months" }),
    chunk("PEOS-00001", [0.8, 0.6], { text: "placement fee one month salary" }),
    chunk("DMW-00002", [0, 1], {
      source: "DMW",
      record_no: 1,
      agency: "101 MOJO",
      text: "RECORD 1 - Agency: 101 MOJO",
    }),
  ]);

  it("adds 1/(60 + rank) from each list and keeps the top k", () => {
    const { retrieved: r, top_vector_sim } = retrieve(normalize([1, 0]), "mojo", idx.chunks, idx.bm25, 2);
    // vector order: PEOS-00000, PEOS-00001, DMW-00002; BM25 ("mojo"): DMW-00002 only
    expect(r.map((c) => c.id)).toEqual(["DMW-00002", "PEOS-00000"]);
    expect(r[0].score).toBeCloseTo(1 / 63 + 1 / 61, 12);
    expect(r[0]).toMatchObject({ rank: 1, vector_rank: 3, bm25_rank: 1 });
    expect(r[1]).toMatchObject({ rank: 2, vector_rank: 1, bm25_rank: null });
    expect(top_vector_sim).toBeCloseTo(1);
  });

  it("breaks RRF ties in insertion order: vector hits before BM25-only hits", () => {
    // 21 chunks: "A" is vector #1 with no keyword match; "Z" is vector #21 (outside the top 20)
    // and the only BM25 match. Both score 1/61; Python's stable sorted() keeps A (inserted first) ahead.
    const fillers = Array.from({ length: 19 }, (_, i) =>
      chunk(`F${i}`, [Math.cos((i + 1) * 0.1), Math.sin((i + 1) * 0.1)], { text: `filler ${i}` }),
    );
    const idx21 = index([
      chunk("A", [1, 0], { text: "alpha" }),
      ...fillers,
      chunk("Z", [-1, 0], { text: "mojo" }),
    ]);
    const r = retrieve(normalize([1, 0]), "mojo", idx21.chunks, idx21.bm25, 3).retrieved;
    expect(r.map((c) => c.id)).toEqual(["A", "Z", "F0"]);
    expect(r[0].score).toBe(r[1].score);
    expect(r[1]).toMatchObject({ vector_rank: null, bm25_rank: 1, vector_sim: null });
  });
});

describe("prompt", () => {
  const ctx = [
    retrieved("PEOS-00016", 1, { page: 6, text: "2-month validity" }),
    retrieved("DMW-00057", 2, { source: "DMW", page: 1, record_no: 1, text: "RECORD 1 - Agency: 101 MOJO" }),
  ];

  it("numbers passages with their source like the notebook's format_context", () => {
    expect(formatContext(ctx)).toBe(
      "[1] (PEOS module, page 6)\n2-month validity\n\n" +
        "[2] (DMW licensed agencies list, page 1, record 1)\nRECORD 1 - Agency: 101 MOJO",
    );
  });

  it("sends the system prompt, then CONTEXT and QUESTION in one user message", () => {
    const m = buildMessages("Is 101 MOJO licensed?", ctx);
    expect(m).toHaveLength(2);
    expect(m[0]).toEqual({ role: "system", content: SYSTEM_PROMPT });
    expect(m[0].content).toContain(
      "Never ask the user for passport, OEC, e-registration or other personal numbers.",
    );
    expect(m[1].role).toBe("user");
    expect(m[1].content).toBe(`CONTEXT:\n${formatContext(ctx)}\n\nQUESTION:\nIs 101 MOJO licensed?`);
  });
});

describe("indexMismatch", () => {
  const meta = { embedModel: "e5", dims: 384, chunks: 1, contentHash: "h", chunker: "c", builtAt: "t" };
  it("flags a dims or model mismatch", () => {
    expect(indexMismatch(meta, { EMBED_MODEL: "e5", EMBED_DIMS: 384 })).toBeNull();
    expect(indexMismatch(meta, { EMBED_MODEL: "e5", EMBED_DIMS: 768 })).toMatch(/EMBED_DIMS/);
  });
});

describe("answerQuestion", () => {
  const idx = index([
    chunk("PEOS-00016", [1, 0], { page: 6, text: "Your OEC has a 2-month validity" }),
    chunk("DMW-00057", [0, 1], { source: "DMW", record_no: 1, text: "RECORD 1 - Agency: 101 MOJO" }),
  ]);
  const cfg = { RETRIEVAL_TOP_K: 3, RETRIEVAL_MIN_SCORE: 0 };
  const deps = (reply: string, calls = { n: 0 }, vec = [1, 0]): AnswerDeps => ({
    embed: async () => normalize(vec),
    chat: async () => {
      calls.n++;
      return reply;
    },
  });

  it("keeps the answer text and lists the retrieved passages as sources", async () => {
    const r = await answerQuestion("OEC?", idx, cfg, deps("The OEC is valid for 2 months [1]."));
    expect(r.answer).toBe("The OEC is valid for 2 months [1].");
    expect(r.fallback).toBe(false);
    expect(r.sources).toEqual([
      { n: 1, title: "PEOS module, page 6" },
      { n: 2, title: "DMW licensed agencies list, page 1, record 1" },
    ]);
    expect(r.meta).toMatchObject({
      retrieved_ids: ["PEOS-00016", "DMW-00057"],
      cited: [1],
      valid_citation: true,
    });
  });

  it("keeps an answer with no valid citation (require_citation is False)", async () => {
    const r = await answerQuestion("OEC?", idx, cfg, deps("Two months [7]."));
    expect(r.fallback).toBe(false);
    expect(r.answer).toBe("Two months [7].");
    expect(r.meta.valid_citation).toBe(false);
  });

  it("replaces a reply starting with FALLBACK by the fixed fallback message", async () => {
    const r = await answerQuestion("NBA finals?", idx, cfg, deps("fallback."));
    expect(r.fallback).toBe(true);
    expect(r.answer).toBe(FALLBACK_MESSAGE);
    expect(FALLBACK_TEXT).toBe(FALLBACK_MESSAGE);
    expect(r.meta.fallback_reason).toBe("model");
    expect(r.sources.map((s) => s.url)).toEqual(["https://dmw.gov.ph"]);
  });

  it("shows the fallback message for an empty reply (site addition)", async () => {
    const r = await answerQuestion("OEC?", idx, cfg, deps("  "));
    expect(r.answer).toBe(FALLBACK_MESSAGE);
    expect(r.meta.fallback_reason).toBe("empty");
  });

  it("always calls the LLM when the score gate is off, and gates below RETRIEVAL_MIN_SCORE when set", async () => {
    const calls = { n: 0 };
    await answerQuestion("x", idx, cfg, deps("ok [1]", calls, [-1, -1]));
    expect(calls.n).toBe(1);
    const gated = await answerQuestion(
      "x",
      idx,
      { ...cfg, RETRIEVAL_MIN_SCORE: 0.5 },
      deps("ok", calls, [-1, -1]),
    );
    expect(calls.n).toBe(1);
    expect(gated.meta).toMatchObject({ gated: true, fallback_reason: "gate", llm_called: false });
    expect(gated.answer).toBe(FALLBACK_MESSAGE);
  });
});
