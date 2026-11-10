import { describe, expect, it } from "vitest";
import { chunkDoc, parseKbDoc, splitByHeadings, windows } from "@/lib/rag/chunk";

const faq = `---
title: "DMW FAQs"
source_url: "https://dmw.gov.ph/faqs"
section: faq
retrieved: 2026-11-10
---

## What is an OEC?
An Overseas Employment Certificate.

## Who issues it?
DMW.
`;

describe("parseKbDoc", () => {
  it("reads frontmatter, including a bare YAML date", () => {
    const d = parseKbDoc("faqs", faq);
    expect(d).toMatchObject({ slug: "faqs", section: "faq", retrieved: "2026-11-10" });
  });

  it("rejects a bad section or missing source_url", () => {
    expect(() => parseKbDoc("x", faq.replace("section: faq", "section: news"))).toThrow(/section/);
    expect(() => parseKbDoc("x", faq.replace(/source_url.*\n/, ""))).toThrow(/source_url/);
  });
});

describe("chunking", () => {
  it("makes one chunk per FAQ heading, keeping the question and a contextual header", () => {
    const chunks = chunkDoc(parseKbDoc("faqs", faq));
    expect(chunks).toHaveLength(2);
    expect(chunks[0].id).toBe("faqs#0");
    expect(chunks[0].text).toBe(
      "DMW FAQs > What is an OEC?\n\nWhat is an OEC?\nAn Overseas Employment Certificate.",
    );
    expect(chunks[1].url).toBe("https://dmw.gov.ph/faqs");
  });

  it("keeps text before the first heading under the title alone", () => {
    expect(splitByHeadings("Intro.\n\n## A\nBody")).toEqual([
      { heading: null, body: "Intro." },
      { heading: "A", body: "Body" },
    ]);
  });

  it("windows long text to ≤ 1500 chars with overlap", () => {
    const text = Array.from({ length: 60 }, (_, i) => `Sentence number ${i} is here.`).join(" ");
    const parts = windows(text, 300, 50);
    expect(parts.length).toBeGreaterThan(1);
    for (const p of parts) expect(p.length).toBeLessThanOrEqual(300);
    // each window starts inside the previous one's tail
    expect(parts[0]).toContain(parts[1].slice(0, 20));
  });
});
