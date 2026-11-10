import { describe, expect, it } from "vitest";
import { answerQuestion, type AnswerDeps } from "@/lib/rag/answer";
import { applyCitations } from "@/lib/rag/citations";
import { FALLBACK_TEXT } from "@/lib/rag/fallback";
import { expandQuery, findAcronyms } from "@/lib/rag/glossary";
import { indexMismatch, type LoadedIndex } from "@/lib/rag/index-store";
import { buildMessages } from "@/lib/rag/prompt";
import { stripReasoning } from "@/lib/rag/sealion";
import { normalize, search } from "@/lib/rag/search";
import { chunk, scored } from "./helpers";

describe("glossary", () => {
  it("finds acronyms case-insensitively and doesn't read POPS-BaM as BM", () => {
    expect(findAcronyms("paano ang oec ko?")).toEqual(["OEC"]);
    expect(findAcronyms("POPS-BaM login")).toEqual(["POPS-BaM"]);
    expect(expandQuery("BM requirements")).toContain("BM = Balik-Manggagawa");
    expect(expandQuery("hello")).toBe("hello");
  });
});

describe("search", () => {
  const chunks = [chunk("a", [1, 0]), chunk("b", [0.9, 0.1], { text: "About the OEC" }), chunk("c", [0, 1])];

  it("ranks by cosine and returns raw scores", () => {
    const r = search(normalize([1, 0]), chunks, { topK: 2 });
    expect(r.map((c) => c.id)).toEqual(["a", "b"]);
    expect(r[0].score).toBeCloseTo(1);
  });

  it("boosts chunks containing a query acronym for ranking only", () => {
    const r = search(normalize([1, 0]), chunks, { topK: 3, acronyms: ["OEC"], boost: 0.1 });
    expect(r[0].id).toBe("b");
    expect(r[0].score).toBeLessThan(1);
  });
});

describe("citations", () => {
  const ctx = [scored("x"), scored("y"), scored("x2", 0.7, { url: "https://dmw.gov.ph/x" })];

  it("renumbers by unique URL in first-cited order and drops invalid numbers", () => {
    const r = applyCitations("Step one [2]. Step two [1][3]. Made up [9].", ctx);
    expect(r.answer).toBe("Step one [1]. Step two [2]. Made up.");
    expect(r.sources.map((s) => s.url)).toEqual(["https://dmw.gov.ph/y", "https://dmw.gov.ph/x"]);
    expect(r.grounded).toBe(true);
  });

  it("marks answers with no valid citation as ungrounded", () => {
    expect(applyCitations("No citations here.", ctx).grounded).toBe(false);
    expect(applyCitations("Wrong [7].", ctx).grounded).toBe(false);
  });
});

describe("stripReasoning", () => {
  it("removes think blocks, orphaned closers and unclosed openers", () => {
    expect(stripReasoning("<think>hmm</think>Answer [1]")).toBe("Answer [1]");
    expect(stripReasoning("reasoning...</think>\nAnswer")).toBe("Answer");
    expect(stripReasoning("Answer <think>cut off")).toBe("Answer");
  });
});

describe("prompt", () => {
  it("uses a system message for Llama models", () => {
    const m = buildMessages("aisingapore/Llama-SEA-LION-v3.5-70B-R", [scored("a")], "Q?");
    expect(m[0].role).toBe("system");
    expect(m[0].content).toContain("[1] Title a — https://dmw.gov.ph/a");
    expect(m.at(-1)).toEqual({ role: "user", content: "QUESTION: Q?" });
  });

  it("puts rules in the first user message for Gemma", () => {
    const m = buildMessages("aisingapore/Gemma-SEA-LION-v3-9B-IT", [scored("a")], "Q?", [
      { role: "assistant", content: "hi" },
    ]);
    expect(m.every((x) => x.role !== "system")).toBe(true);
    expect(m[0].role).toBe("user");
    expect(m[0].content).toContain("CONTEXT:");
  });
});

describe("indexMismatch", () => {
  const meta = {
    embedModel: "gemini-embedding-001",
    dims: 768,
    chunks: 1,
    contentHash: "h",
    chunker: "c",
    builtAt: "t",
  };
  it("flags a dims or model mismatch", () => {
    expect(indexMismatch(meta, { EMBED_MODEL: "gemini-embedding-001", EMBED_DIMS: 768 })).toBeNull();
    expect(indexMismatch(meta, { EMBED_MODEL: "gemini-embedding-001", EMBED_DIMS: 1024 })).toMatch(
      /EMBED_DIMS/,
    );
  });
});

describe("answerQuestion", () => {
  const index: LoadedIndex = {
    meta: { embedModel: "m", dims: 2, chunks: 2, contentHash: "h", chunker: "c", builtAt: "t" },
    chunks: [
      chunk("oec", [1, 0], { section: "oec-bm" }),
      chunk("hotline", [0, 1], { section: "contact", text: "DMW hotline 1348" }),
    ],
  };
  const cfg = {
    SEALION_MODEL: "aisingapore/Llama-SEA-LION-v3.5-70B-R",
    RETRIEVAL_TOP_K: 6,
    RETRIEVAL_MIN_SCORE: 0.55,
  };
  const deps = (vec: number[], reply: string, calls = { n: 0 }): AnswerDeps => ({
    embed: async () => normalize(vec),
    chat: async () => {
      calls.n++;
      return reply;
    },
  });

  it("skips the LLM entirely below the score gate", async () => {
    const calls = { n: 0 };
    const r = await answerQuestion("NBA finals?", [], index, cfg, deps([-1, -1], "x", calls));
    expect(calls.n).toBe(0);
    expect(r.fallback).toBe(true);
    expect(r.meta.gated).toBe(true);
    expect(r.answer).toBe(FALLBACK_TEXT);
    // fallback links the official site and the indexed hotline
    expect(r.sources.map((s) => s.url)).toContain("https://dmw.gov.ph/hotline");
  });

  it("returns a cited answer when grounded", async () => {
    const r = await answerQuestion("OEC?", [], index, cfg, deps([1, 0], "Use the portal [1]."));
    expect(r.fallback).toBe(false);
    expect(r.sources).toEqual([{ n: 1, title: "Title oec", url: "https://dmw.gov.ph/oec" }]);
  });

  it("falls back on the FALLBACK token and on uncited answers", async () => {
    expect(
      (await answerQuestion("OEC?", [], index, cfg, deps([1, 0], "FALLBACK"))).meta.fallback_reason,
    ).toBe("model");
    expect(
      (await answerQuestion("OEC?", [], index, cfg, deps([1, 0], "Trust me."))).meta.fallback_reason,
    ).toBe("ungrounded");
  });
});
