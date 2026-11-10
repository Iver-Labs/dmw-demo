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

  it("reads optional per-file chunk settings and validates them", () => {
    const withSize = (extra: string) => faq.replace("section: faq", `section: faq\n${extra}`);
    expect(parseKbDoc("x", withSize("chunk_size: 600\nchunk_overlap: 75"))).toMatchObject({
      chunkSize: 600,
      chunkOverlap: 75,
    });
    expect(parseKbDoc("x", faq)).not.toHaveProperty("chunkSize");
    // Overlap above 25% of the size (the notebook's Run D collapse) is rejected.
    expect(() => parseKbDoc("x", withSize("chunk_size: 800\nchunk_overlap: 201"))).toThrow(/at most 25%/);
    expect(() => parseKbDoc("x", withSize("chunk_size: 100"))).toThrow(/between/);
    expect(() => parseKbDoc("x", withSize("chunk_size: 600.5"))).toThrow(/whole number/);
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

  it("windows long sections at the file's chunk_size", () => {
    const body = Array.from({ length: 80 }, (_, i) => `Sentence number ${i} is here.`).join(" ");
    const raw = `---\ntitle: "PEOS"\nsource_url: "https://example.gov.ph/peos"\nsection: guides\nretrieved: 2026-11-10\nchunk_size: 600\nchunk_overlap: 75\n---\n\n## Fees\n${body}\n`;
    const chunks = chunkDoc(parseKbDoc("peos", raw));
    expect(chunks.length).toBeGreaterThan(2);
    for (const c of chunks) expect(c.text.length).toBeLessThanOrEqual("PEOS > Fees\n\n".length + 600);
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
