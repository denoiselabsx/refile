/**
 * POST /api/anon-convert/upload-url
 * ────────────────────────────────
 * Server-side proxy that issues a one-shot Convex storage upload URL
 * for an anonymous file. The browser would otherwise need the bridge
 * secret to call the underlying Convex mutation directly — which we
 * deliberately don't ship to the browser. This route is the trust
 * boundary.
 *
 * Same burst-rate-limit shape as /api/anon-convert. The upload URL
 * itself is single-use and short-lived (Convex contract), so even if
 * one slips through abuse it expires quickly.
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

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

function clientIp(request) {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "0.0.0.0"
  );
}

const BURST_WINDOW_MS = 10_000;
const BURST_MAX = 20; // Slightly higher than the submit limit — users
                     // may upload several files for batch tiles.
const burstByIp = new Map();

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

function jsonError(code, message, status) {
  return cors(
    new Response(JSON.stringify({ error: { code, message } }), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  );
}

export async function POST(request) {
  const ip = clientIp(request);
  if (!burstAllowed(ip)) {
    return jsonError("rate_limited", "Too many uploads. Slow down.", 429);
  }

  const secret = process.env.API_BRIDGE_SECRET;
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!secret || !convexUrl) {
    return jsonError(
      "config_error",
      "Anonymous uploads are temporarily unavailable.",
      503
    );
  }

  try {
    const client = new ConvexHttpClient(convexUrl);
    const url = await client.mutation(api.prompts.generateAnonUploadUrl, {
      secret,
    });
    return cors(
      new Response(JSON.stringify({ uploadUrl: url }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  } catch (err) {
    return jsonError(
      "upload_url_failed",
      err instanceof Error ? err.message : String(err),
      500
    );
  }
}
