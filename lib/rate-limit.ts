/**
 * Per-key sliding-window limiter, in memory. Per instance only: with max 2 Cloud Run
 * instances a client can get at most 2× the limit, which is fine for a demo.
 */
export class RateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs = 60_000,
  ) {}

  /** Records a hit and returns true if allowed, false if over the limit. */
  check(key: string, now = Date.now()): boolean {
    const since = now - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > since);
    const allowed = recent.length < this.limit;
    if (allowed) recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 10_000) this.prune(since);
    return allowed;
  }

  private prune(since: number) {
    for (const [k, ts] of this.hits) if (!ts.some((t) => t > since)) this.hits.delete(k);
  }
}

/** First address in X-Forwarded-For (set by Cloud Run's front end). Never log it. */
export function clientKey(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}
