import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { clientKey, RateLimiter } from "@/lib/rate-limit";
import { contentHash } from "@/scripts/lib/content-hash.mjs";

describe("RateLimiter", () => {
  it("allows `limit` hits per window per key", () => {
    const rl = new RateLimiter(2, 60_000);
    expect(rl.check("a", 0)).toBe(true);
    expect(rl.check("a", 1)).toBe(true);
    expect(rl.check("a", 2)).toBe(false);
    expect(rl.check("b", 2)).toBe(true);
    expect(rl.check("a", 60_001)).toBe(true);
  });

  it("keys on the first X-Forwarded-For address", () => {
    expect(clientKey(new Headers({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" }))).toBe("203.0.113.5");
  });
});

describe("contentHash", () => {
  it("is stable across CRLF and changes when content changes", () => {
    const root = mkdtempSync(path.join(tmpdir(), "kb-"));
    mkdirSync(path.join(root, "content", "kb"), { recursive: true });
    const f = path.join(root, "content", "kb", "a.md");
    writeFileSync(f, "line1\nline2\n");
    const h1 = contentHash(root);
    writeFileSync(f, "line1\r\nline2\r\n");
    expect(contentHash(root)).toBe(h1);
    writeFileSync(f, "changed\n");
    expect(contentHash(root)).not.toBe(h1);
  });
});
