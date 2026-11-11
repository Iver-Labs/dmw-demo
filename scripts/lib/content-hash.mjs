// Hash of everything under content/handoff (the notebook's chunks the index is built from).
// Shared by ingest (writes it) and check-index (verifies it).
// Node built-ins only: Cloud Build runs check-index without `npm install`.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

function listFiles(dir, base = dir) {
  let out = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out = out.concat(listFiles(full, base));
    else if (name !== ".gitkeep") out.push(path.relative(base, full).split(path.sep).join("/"));
  }
  return out;
}

/** sha256 over sorted relative paths and contents (CRLF normalised so Windows checkouts match). */
export function contentHash(root = process.cwd()) {
  const dir = path.join(root, "content", "handoff");
  const hash = createHash("sha256");
  for (const rel of listFiles(dir).sort()) {
    const text = readFileSync(path.join(dir, rel), "utf8").replace(/\r\n/g, "\n");
    hash.update(rel).update("\0").update(text).update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}
