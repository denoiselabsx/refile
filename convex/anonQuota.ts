/**
 * Anonymous (no-account) quota + IP-hashing for public Quick Convert.
 *
 * Why this module exists
 * ──────────────────────
 * The public /convert/<recipe> pages let anyone convert a file without
 * signing up — that's the SEO funnel. But "anyone" includes scrapers,
 * abusive automation, and people farming free GPU/CPU time. We need a
 * cheap, deterministic abuse cap that:
 *
 *   1. Doesn't store raw IPs (GDPR-friendlier + smaller leak surface).
 *   2. Resets daily so a real user is never permanently locked out.
 *   3. Bills nothing — anon jobs skip Polar entirely (no userId).
 *   4. Tracks bytes processed for second-order abuse detection
 *      (one IP cycling tiny files is fine; one IP burning gigabytes
 *      isn't).
 *
 * Design decisions
 * ────────────────
 * - IP hash: sha256(ip + ANON_IP_SECRET). The secret prevents rainbow-
 *   table lookups if the database ever leaks. The hash is stable per IP
 *   per deployment, which is exactly what we need for quota; it is NOT
 *   reversible.
 * - Quota: 3 successful conversions per ipHash per UTC day, 25MB file cap.
 *   Numbers chosen to convert real users (1 = "I'll convert this one PDF",
 *   3 = batch-curious, beyond = wants an account anyway) without being
 *   so stingy that the SEO landing page bounces. Tunable here.
 * - Daily reset: UTC bucket key "YYYY-MM-DD" stored on the rollup row.
 *   No background cron needed; a new day = new bucket = fresh count.
 * - Failures don't count: meterAnonSuccess is only called from runJob's
 *   success path (mirror of meterSuccess for authed users).
 *
 * Pure functions live here; the Convex mutation/query wrappers live in
 * anonUsage.ts so this module stays unit-testable without Convex stubs.
 */

/** Per-day, per-IP cap for successful anonymous conversions. */
export const ANON_DAILY_LIMIT = 3;

/** Largest single file (bytes) we'll process for an anonymous request.
 *  25 MB covers ~95% of real-world PDFs, phone photos, and short clips,
 *  while keeping our sandbox compute cost bounded per anon hit. */
export const ANON_FILE_SIZE_CAP = 25 * 1024 * 1024;

/** Per-day cumulative bytes per ipHash. Stops a single IP from cycling
 *  near-cap files all day; well above the daily limit's natural ceiling
 *  (3 × 25 MB = 75 MB), so it only catches genuine abuse patterns. */
export const ANON_DAILY_BYTES_CAP = 300 * 1024 * 1024;

/* ──────────────────────────────────────────────────────────────── *
 *  IP hashing — Web Crypto, available in Convex's V8 runtime.
 * ──────────────────────────────────────────────────────────────── */

/**
 * Hash an IP with a deployment-wide secret. The secret comes from the
 * ANON_IP_SECRET environment variable; falling back to a fixed string
 * here would defeat the purpose (any leaked DB would be re-attributable),
 * so we throw loudly if it's missing.
 *
 * Returns the hex-encoded SHA-256 digest (64 chars).
 */
export async function hashIp(ip: string): Promise<string> {
  const secret = process.env.ANON_IP_SECRET;
  if (!secret) {
    throw new Error(
      "ANON_IP_SECRET is not set on the Convex deployment. Anonymous " +
        "conversions are disabled until a random secret is configured."
    );
  }
  const data = new TextEncoder().encode(`${ip}::${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ──────────────────────────────────────────────────────────────── *
 *  Day bucket
 * ──────────────────────────────────────────────────────────────── */

/** "YYYY-MM-DD" in UTC. Stable, sortable, locale-free. */
export function utcDayKey(now: number = Date.now()): string {
  const d = new Date(now);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* ──────────────────────────────────────────────────────────────── *
 *  Quota assertion
 * ──────────────────────────────────────────────────────────────── */

export type AnonUsageRow = {
  count: number;
  bytesProcessed: number;
} | null;

export type QuotaCheck =
  | { ok: true; remaining: number }
  | {
      ok: false;
      reason:
        | "daily_limit"
        | "file_too_large"
        | "daily_bytes"
        | "missing_secret";
      message: string;
      remaining: number;
    };

/**
 * Decide whether an anonymous submit may proceed. Pure: takes the
 * already-fetched rollup row + the proposed file size, returns a verdict
 * the caller can either throw on or surface as a structured error.
 *
 * No DB writes here — the counter is only bumped on SUCCESS, by
 * meterAnonSuccess (mirror of meterSuccess in runJob.ts).
 */
export function checkAnonQuota(
  rollup: AnonUsageRow,
  fileSizeBytes: number
): QuotaCheck {
  const usedCount = rollup?.count ?? 0;
  const usedBytes = rollup?.bytesProcessed ?? 0;
  const remaining = Math.max(0, ANON_DAILY_LIMIT - usedCount);

  if (fileSizeBytes > ANON_FILE_SIZE_CAP) {
    return {
      ok: false,
      reason: "file_too_large",
      message: `Free conversions are limited to ${Math.round(
        ANON_FILE_SIZE_CAP / (1024 * 1024)
      )} MB. Sign up free to convert larger files.`,
      remaining,
    };
  }
  if (usedCount >= ANON_DAILY_LIMIT) {
    return {
      ok: false,
      reason: "daily_limit",
      message: `You've used all ${ANON_DAILY_LIMIT} free conversions today. Sign up free for 30 per day, or come back tomorrow.`,
      remaining: 0,
    };
  }
  if (usedBytes + fileSizeBytes > ANON_DAILY_BYTES_CAP) {
    return {
      ok: false,
      reason: "daily_bytes",
      message:
        "You've hit today's data limit for free conversions. Sign up to keep going.",
      remaining,
    };
  }
  return { ok: true, remaining: remaining - 1 };
}
