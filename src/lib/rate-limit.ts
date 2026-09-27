import "server-only";

/**
 * Sliding-window rate limiter kept in memory. Good enough for a single
 * server or as a first line of defence on serverless; use a shared store
 * (e.g. Redis) if you run many instances and need hard limits.
 */
const buckets = new Map<string, number[]>();
let lastSweep = Date.now();

export function rateLimit(key: string, { limit, windowMs }: { limit: number; windowMs: number }) {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

  if (now - lastSweep > windowMs) {
    for (const [k, times] of buckets) {
      if (!times.some((t) => now - t < windowMs)) buckets.delete(k);
    }
    lastSweep = now;
  }

  if (recent.length >= limit) {
    buckets.set(key, recent);
    const retryAfter = Math.ceil((windowMs - (now - recent[0])) / 1000);
    return { ok: false as const, retryAfter };
  }
  recent.push(now);
  buckets.set(key, recent);
  return { ok: true as const, remaining: limit - recent.length };
}

export function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}
