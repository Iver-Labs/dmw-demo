#!/usr/bin/env node
// npm run model:fetch — download the local embedding model into models/ and verify every file.
//
// The model is intfloat/multilingual-e5-small (MIT; 384 dims; ~100 languages incl. Tagalog via
// XLM-R's CC-100 data) in the ONNX export Transformers.js loads (Xenova/multilingual-e5-small, not
// gated). Files come from a pinned Hugging Face commit and must match the SHA-256 below, so every
// build ships the same weights.
// The app never downloads models at runtime (lib/rag/embed.ts sets allowRemoteModels = false).
// Node built-ins only: it runs in the Docker builder stage.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const REPO = "Xenova/multilingual-e5-small";
const REVISION = "761b726dd34fb83930e26aab4e9ac3899aa1fa78";
const FILES = {
  "config.json": "cb99455288675345e1a4f411438d5d0adbba5fbd3a67ea4fb03c015433b996c1",
  "tokenizer.json": "0b44a9d7b51c3c62626640cda0e2c2f70fdacdc25bbbd68038369d14ebdf4c39",
  "tokenizer_config.json": "a1d6bc8734a6f635dc158508bef000f8e2e5a759c7d92f984b2c86e5ff53425b",
  "special_tokens_map.json": "d05497f1da52c5e09554c0cd874037a083e1dc1b9cfd48034d1c717f1afc07a7",
  // Full-precision (fp32) weights, 470 MB: the precision the group notebook ran the model at
  // (sentence-transformers on PyTorch). The 8-bit file (118 MB) shifted similarities by up to 0.01.
  "onnx/model.onnx": "4aa845c27760e06e9a686b9d8b5d440eae4b6612cd09e5b522b716d3941f77ff",
};

const dest = path.join(process.cwd(), "models", REPO);
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

let downloaded = 0;
for (const [file, expected] of Object.entries(FILES)) {
  const target = path.join(dest, file);
  if (existsSync(target) && sha256(readFileSync(target)) === expected) continue;

  const url = `https://huggingface.co/${REPO}/resolve/${REVISION}/${file}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) {
    console.error(`model:fetch failed: ${file} returned HTTP ${res.status}`);
    process.exit(1);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const actual = sha256(buf);
  if (actual !== expected) {
    console.error(`model:fetch failed: ${file} checksum mismatch (expected ${expected}, got ${actual})`);
    process.exit(1);
  }
  mkdirSync(path.dirname(target), { recursive: true });
  const tmp = `${target}.part`;
  writeFileSync(tmp, buf);
  rmSync(target, { force: true });
  renameSync(tmp, target);
  downloaded++;
}

console.log(
  downloaded
    ? `model:fetch ok: ${downloaded} file(s) downloaded and verified into models/${REPO}`
    : `model:fetch ok: models/${REPO} already present and verified`,
);
