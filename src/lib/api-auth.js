import { createHash } from "node:crypto";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

export const KEY_PREFIX_LEN = 11; // "rf_live_" + 3 chars

function client() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL not set");
  return new ConvexHttpClient(url);
}

export function hashKey(rawKey) {
  return createHash("sha256").update(rawKey).digest("hex");
}

// Validates a Bearer token from a Next.js Request. Resolves to
// { userId, scopes, keyId } or returns null. Never throws — the caller
// returns a 401 Response on null.
export async function authenticate(request) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(rf_live_[A-Za-z0-9_-]{20,})$/);
  if (!match) return null;
  const raw = match[1];
  const keyHash = hashKey(raw);

  const secret = process.env.API_BRIDGE_SECRET;
  if (!secret) {
    // Misconfiguration; treat as auth failure (don't leak the cause).
    return null;
  }

  try {
    const res = await client().mutation(api.apiKeys.resolveKey, {
      secret,
      keyHash,
    });
    if (!res) return null;
    return res;
  } catch {
    return null;
  }
}

// Standard 401 body used by every /api/v1/* route on auth failure.
export function unauthorized() {
  return new Response(
    JSON.stringify({
      error: { code: "unauthorized", message: "Missing or invalid API key." },
    }),
    {
      status: 401,
      headers: { "Content-Type": "application/json" },
    }
  );
}
