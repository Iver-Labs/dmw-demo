import { describe, expect, it } from "vitest";
import {
  missingUnits,
  normalizeForMatch,
  phraseFound,
  scoreRetrieval,
  unitsInChunk,
  type Evidence,
} from "@/lib/eval/retrieval";

describe("normalizeForMatch (notebook normalize_for_match)", () => {
  it("collapses one-word-per-line PDF text, curly quotes and dashes", () => {
    expect(normalizeForMatch("Your\n \nOEC\n has a 2–month   validity")).toBe(
      "your oec has a 2-month validity",
    );
    expect(normalizeForMatch("“Let’s”")).toBe('"let\'s"');
  });
});

describe("phraseFound / unitsInChunk", () => {
  const record = "RECORD 1 - Agency: 101 MOJO\nCurrently Valid: Yes\nExpiration Date: 2031-10-03";

  it("needs every part of an array phrase in the same chunk", () => {
    const tuple = ["RECORD 1 - Agency: 101 MOJO", "Currently Valid:", "Expiration Date: 2031-10-03"];
    expect(phraseFound(tuple, normalizeForMatch(record))).toBe(true);
    expect(phraseFound(tuple, normalizeForMatch("RECORD 1 - Agency: 101 MOJO only"))).toBe(false);
  });

  it("covers a unit when any one of its phrases matches", () => {
    const evidence: Evidence = {
      U1: ["one-month basic salary", "one month of the basic salary"],
      U2: ["seafarers"],
    };
    expect(unitsInChunk("Up to ONE MONTH of the basic salary.", evidence)).toEqual(["U1"]);
  });
});

describe("scoreRetrieval (notebook score_retrieval)", () => {
  const evidence: Evidence = { U1: ["alpha"], U2: ["beta"] };

  it("computes Precision@k over k, Recall@k over units, and reciprocal rank", () => {
    const s = scoreRetrieval(["nothing", "has alpha", "alpha and beta"], evidence, 3);
    expect(s.precision).toBeCloseTo(2 / 3);
    expect(s.recall).toBe(1);
    expect(s.reciprocalRank).toBe(0.5);
    expect(s.coveredPerRank).toEqual([[], ["U1"], ["U1", "U2"]]);
  });

  it("only looks at the first k chunks and scores 0 with no hit", () => {
    const s = scoreRetrieval(["x", "y", "alpha"], evidence, 2);
    expect(s).toMatchObject({ precision: 0, recall: 0, reciprocalRank: 0 });
  });
});

describe("missingUnits (notebook check_evidence_phrases)", () => {
  it("reports units that appear in no document", () => {
    const evidence: Evidence = { U1: ["2-month validity"], U2: [["RECORD 9", "Currently Valid:"]] };
    expect(missingUnits(evidence, ["The OEC has a 2-month\nvalidity."])).toEqual(["U2"]);
  });
});
