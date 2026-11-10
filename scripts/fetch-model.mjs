#!/usr/bin/env node
// npm run model:fetch — download the local embedding model into models/ and verify every file.
//
// The model is sentence-transformers/all-MiniLM-L6-v2, the group notebook's EMBEDDING_MODEL, in the
// ONNX export Transformers.js loads (Xenova/all-MiniLM-L6-v2, Apache-2.0). Files come from a pinned
// Hugging Face commit and must match the SHA-256 below, so every build ships the same weights.
// The app never downloads models at runtime (lib/rag/embed.ts sets allowRemoteModels = false).
// Node built-ins only: it runs in the Docker builder stage.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const REPO = "Xenova/all-MiniLM-L6-v2";
const REVISION = "751bff37182d3f1213fa05d7196b954e230abad9";
const FILES = {
  "config.json": "7135149f7cffa1a573466c6e4d8423ed73b62fd2332c575bf738a0d033f70df7",
  "tokenizer.json": "da0e79933b9ed51798a3ae27893d3c5fa4a201126cef75586296df9b4d2c62a0",
  "tokenizer_config.json": "9261e7d79b44c8195c1cada2b453e55b00aeb81e907a6664974b4d7776172ab3",
  "special_tokens_map.json": "b6d346be366a7d1d48332dbc9fdf3bf8960b5d879522b7799ddba59e76237ee3",
  // 8-bit quantized weights (23 MB; the full-precision file is 90 MB).
  "onnx/model_quantized.onnx": "afdb6f1a0e45b715d0bb9b11772f032c399babd23bfc31fed1c170afc848bdb1",
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
