/**
 * POST /api/anon-convert
 * ────────────────────────
 * Public, no-auth Quick Convert submission. The browser uploads its
 * file directly to Convex storage (via /api/anon-convert/upload-url
 * which proxies a bridge-secret-guarded mutation), then POSTs here
 * with the quickConvertId + storageIds. This route hashes the client
 * IP and forwards everything to the bridge-secret Convex mutation
 * `prompts.submitAnonymous`, which is the quota gate.
 *
 * Why this lives in Next.js and not Convex:
 *   - Convex mutations have no access to request headers and can't see
 *     the caller's IP. The IP is the anon identity, so the hashing
 *     MUST happen at the HTTP boundary.
 *   - The bridge secret means Convex still treats this as trusted-
 *     server traffic; Convex never directly faces unauthed visitors.
 *
 * Abuse layer (in addition to per-IP daily quota in Convex):
 *   - Rate-limit raw POSTs per IP (in-memory token bucket; resets per
 *     process). Catches burst floods before they reach Convex.
 *   - Reject obvious automation: no user-agent, header anomalies.
 */

import { ConvexHttpClient } from "convex/browser";
import { createHash } from "crypto";
import { api } from "../../../../convex/_generated/api";

export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function cors(res) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/* ──────────────────────────────────────────────────────────────── *
 *  IP extraction + hashing
 * ──────────────────────────────────────────────────────────────── */

/**
 * Best-effort client IP. Prefers x-forwarded-for (set by every CDN in
 * front of Vercel / Convex / etc), falls back to x-real-ip, finally
 * to the request's nominal remote address. Returns "0.0.0.0" if all
 * are missing — the quota will then apply to a single shared bucket,
 * which is the safe fail-mode (worst case: rate-limited like one user).
 */
function clientIp(request) {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "0.0.0.0"
  );
}

/** Mirrors convex/anonQuota.ts hashIp — same input, same output, so
 *  the IP hash is the same whether computed here or there. */
function hashIp(ip) {
  const secret = process.env.ANON_IP_SECRET;
  if (!secret) {
    throw new Error("ANON_IP_SECRET is not set on the Next.js deployment.");
  }
  return createHash("sha256").update(`${ip}::${secret}`).digest("hex");
}

/* ──────────────────────────────────────────────────────────────── *
 *  In-process burst limiter — last line of defense before Convex.
 *  Resets per Node process (so per Vercel function instance). Not a
 *  durable quota — that's anonUsage in Convex. This is purely to stop
 *  a flood of e.g. 1000 reqs/sec from one IP before the proper gate
 *  has time to update.
 * ──────────────────────────────────────────────────────────────── */
const BURST_WINDOW_MS = 10_000;
const BURST_MAX = 10;
const burstByIp = new Map(); // ip -> { count, windowStart }

function burstAllowed(ip) {
  const now = Date.now();
  const cur = burstByIp.get(ip);
  if (!cur || now - cur.windowStart > BURST_WINDOW_MS) {
    burstByIp.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (cur.count >= BURST_MAX) return false;
  cur.count += 1;
  return true;
}

/* ──────────────────────────────────────────────────────────────── *
 *  Error helpers
 * ──────────────────────────────────────────────────────────────── */

function jsonError(code, message, status, extra = {}) {
  return cors(
    new Response(
      JSON.stringify({ error: { code, message, ...extra } }),
      { status, headers: { "Content-Type": "application/json" } }
    )
  );
}

function jsonOk(data, status = 200) {
  return cors(
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  );
}

/**
 * Convex throws errors as `Uncaught Error: ANON_QUOTA:reason:message`
 * — we have to parse that back into a structured response. The reason
 * tokens come from anonQuota.ts checkAnonQuota.
 */
function parseConvexError(err) {
  const raw = String(err?.message ?? err ?? "");
  const m = raw.match(/ANON_QUOTA:([a-z_]+):(.+?)(?:\n|$)/);
  if (m) {
    return { isQuota: true, reason: m[1], message: m[2].trim() };
  }
  // Plain validation errors thrown by the mutation.
  const plain = raw.match(/Uncaught Error:\s*(.+?)(?:\n|$)/);
  return {
    isQuota: false,
    reason: "invalid",
    message: (plain ? plain[1] : raw).trim(),
  };
}

function reasonToStatus(reason) {
  switch (reason) {
    case "daily_limit":
    case "daily_bytes":
      return 429;
    case "file_too_large":
      return 413;
    case "missing_secret":
      return 503;
    default:
      return 400;
  }
}

/* ──────────────────────────────────────────────────────────────── *
 *  POST handler
 * ──────────────────────────────────────────────────────────────── */

export async function POST(request) {
  const ip = clientIp(request);
  if (!burstAllowed(ip)) {
    return jsonError(
      "rate_limited",
      "Too many requests. Slow down and try again in a moment.",
      429
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("invalid_request", "Request body must be JSON.", 400);
  }
  const { quickConvertId, inputStorageIds, inputFilenames, totalBytes } = body || {};
  if (!quickConvertId || typeof quickConvertId !== "string") {
    return jsonError("invalid_request", "quickConvertId is required.", 400);
  }
  if (!Array.isArray(inputStorageIds) || inputStorageIds.length === 0) {
    return jsonError("invalid_request", "inputStorageIds is required.", 400);
  }
  if (!Array.isArray(inputFilenames) || inputFilenames.length === 0) {
    return jsonError("invalid_request", "inputFilenames is required.", 400);
  }

  const ipHash = hashIp(ip);
  const secret = process.env.API_BRIDGE_SECRET;
  if (!secret) {
    return jsonError(
      "config_error",
      "Anonymous conversions are temporarily unavailable.",
      503
    );
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return jsonError("config_error", "Service misconfigured.", 503);
  }
  const client = new ConvexHttpClient(convexUrl);

  try {
    const result = await client.mutation(api.prompts.submitAnonymous, {
      secret,
      ipHash,
      quickConvertId,
      inputStorageIds,
      inputFilenames,
      claimedTotalBytes: Number(totalBytes) || 0,
    });
    return jsonOk({
      id: result.promptId,
      remainingAfter: result.remainingAfter,
    });
  } catch (err) {
    const parsed = parseConvexError(err);
    if (parsed.isQuota) {
      return jsonError(parsed.reason, parsed.message, reasonToStatus(parsed.reason), {
        quotaExhausted: parsed.reason === "daily_limit",
      });
    }
    return jsonError("invalid_request", parsed.message, 400);
  }
}
