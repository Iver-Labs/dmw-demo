import matter from "gray-matter";
import { SECTIONS, type Chunk, type KbDoc, type Section } from "./types";

/** Recorded in index.meta.json; change it whenever chunking behaviour changes. */
export const CHUNKER_ID = "heading-split-1500-overlap-200";
export const CHUNK_SIZE = 1500;
export const CHUNK_OVERLAP = 200;

/** Parse one content/kb Markdown file (frontmatter + body). Throws on bad frontmatter. */
export function parseKbDoc(slug: string, raw: string): KbDoc {
  const { data, content } = matter(raw);
  const fail = (msg: string) => {
    throw new Error(`content/kb/${slug}.md: ${msg}`);
  };
  if (typeof data.title !== "string" || !data.title.trim()) fail("missing title");
  if (typeof data.source_url !== "string" || !/^https?:\/\//.test(data.source_url))
    fail("source_url must be an http(s) URL");
  if (!SECTIONS.includes(data.section)) fail(`section must be one of ${SECTIONS.join(", ")}`);
  // YAML parses bare dates into Date objects.
  const retrieved =
    data.retrieved instanceof Date ? data.retrieved.toISOString().slice(0, 10) : String(data.retrieved ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(retrieved)) fail("retrieved must be YYYY-MM-DD");
  return {
    slug,
    title: data.title.trim(),
    sourceUrl: data.source_url,
    section: data.section as Section,
    retrieved,
    body: content.trim(),
  };
}

interface Part {
  heading: string | null;
  body: string;
}

/** Split Markdown at ## / ### headings. Text before the first heading becomes a part with no heading. */
export function splitByHeadings(markdown: string): Part[] {
  const parts: Part[] = [];
  let current: Part = { heading: null, body: "" };
  for (const line of markdown.split("\n")) {
    const m = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (m) {
      if (current.heading || current.body.trim()) parts.push(current);
      current = { heading: m[2], body: "" };
    } else {
      current.body += line + "\n";
    }
  }
  if (current.heading || current.body.trim()) parts.push(current);
  return parts.map((p) => ({ ...p, body: p.body.trim() })).filter((p) => p.heading || p.body);
}

/** Fixed-size windows with overlap, preferring to break at a paragraph or sentence end. */
export function windows(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  if (text.length <= size) return [text];
  const out: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + size, text.length);
    if (end < text.length) {
      const slice = text.slice(start, end);
      const minBreak = Math.floor(size * 0.6);
      const breakAt = Math.max(slice.lastIndexOf("\n\n"), slice.lastIndexOf(". "));
      if (breakAt >= minBreak) end = start + breakAt + 1;
    }
    out.push(text.slice(start, end).trim());
    if (end >= text.length) break;
    start = end - overlap;
  }
  return out.filter(Boolean);
}

/**
 * Chunk a doc. FAQ, directory and contact pages are written one item per ## heading
 * (one Q&A / office / hotline group), so each heading is one chunk; long OEC/BM guide
 * sections are windowed. Every chunk is prefixed with "title > heading".
 */
export function chunkDoc(doc: KbDoc): Chunk[] {
  const chunks: Chunk[] = [];
  for (const part of splitByHeadings(doc.body)) {
    const header = part.heading ? `${doc.title} > ${part.heading}` : doc.title;
    // Keep the FAQ question in the text, not only in the header.
    const body = doc.section === "faq" && part.heading ? `${part.heading}\n${part.body}` : part.body;
    if (!body.trim()) continue;
    for (const piece of windows(body)) {
      chunks.push({
        id: `${doc.slug}#${chunks.length}`,
        text: `${header}\n\n${piece}`,
        title: doc.title,
        url: doc.sourceUrl,
        section: doc.section,
      });
    }
  }
  return chunks;
}
