// Per-key token bucket: 10 rps sustained, burst of 20. In-memory per
// Vercel function instance — effective limit scales with instance count
// but is good enough for v1. Upgrade to Upstash when abuse appears.

const buckets = new Map(); // keyId -> { tokens, lastRefill }
const RATE_PER_SEC = 10;
const BURST = 20;

export function checkRateLimit(keyId) {
  if (!keyId) return { allowed: false, retryAfter: 1 };
  const now = Date.now();
  const bucket = buckets.get(keyId) ?? { tokens: BURST, lastRefill: now };
  const elapsed = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(BURST, bucket.tokens + elapsed * RATE_PER_SEC);
  bucket.lastRefill = now;

  if (bucket.tokens < 1) {
    buckets.set(keyId, bucket);
    const retryAfter = Math.max(1, Math.ceil((1 - bucket.tokens) / RATE_PER_SEC));
    return { allowed: false, retryAfter };
  }

  bucket.tokens -= 1;
  buckets.set(keyId, bucket);
  return { allowed: true };
}

// Optional helper for tests / admin tooling. Not exported for general use.
export function _resetRateLimits() {
  buckets.clear();
}
