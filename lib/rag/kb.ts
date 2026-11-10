import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseKbDoc } from "./chunk";
import type { KbDoc, Section } from "./types";

export const KB_DIR = "content/kb";

/** All curated docs, sorted by slug. Synchronous so pages that use it prerender at build time. */
export function loadKbDocs(root = process.cwd()): KbDoc[] {
  const dir = path.join(root, "content", "kb");
  let files: string[];
  try {
    files = readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .sort();
  } catch {
    return [];
  }
  return files.map((f) => parseKbDoc(f.replace(/\.md$/, ""), readFileSync(path.join(dir, f), "utf8")));
}

export function docsBySection(section: Section, root?: string): KbDoc[] {
  return loadKbDocs(root).filter((d) => d.section === section);
}
