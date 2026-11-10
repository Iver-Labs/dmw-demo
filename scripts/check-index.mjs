#!/usr/bin/env node
// Fails if content/kb changed without re-running `npm run ingest`. Runs in Cloud Build before the image build.
import { existsSync, readFileSync, statSync } from "node:fs";
import { contentHash } from "./lib/content-hash.mjs";

const fail = (msg) => {
  console.error(`check:index failed: ${msg}`);
  process.exit(1);
};

for (const f of ["data/index.json", "data/index.meta.json"])
  if (!existsSync(f) || statSync(f).size === 0) fail(`${f} is missing or empty: run npm run ingest`);

const meta = JSON.parse(readFileSync("data/index.meta.json", "utf8"));
const actual = contentHash();
if (meta.contentHash !== actual) fail("content changed: run npm run ingest");

console.log(`check:index ok (${meta.chunks} chunks, ${meta.embedModel}/${meta.dims}, built ${meta.builtAt})`);
