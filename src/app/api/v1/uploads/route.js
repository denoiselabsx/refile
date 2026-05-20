import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { authenticate, unauthorized } from "@/lib/api-auth";
import { errorResponse, okResponse } from "@/lib/api-errors";
import { checkRateLimit } from "@/lib/api-rate-limit";

// Two-step upload: this endpoint returns a short-lived Convex-signed URL;
// the client then POSTs the file body directly to that URL and receives
// { storageId } back from Convex. We never proxy file bytes through Next.
// Convex upload URLs expire ~30 minutes after issuance.

export const runtime = "nodejs";

const CORS_ORIGIN = { "Access-Control-Allow-Origin": "*" };

function convexClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
  return new ConvexHttpClient(url);
}

function withCors(res) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  return res;
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function POST(request) {
  const auth = await authenticate(request);
  if (!auth) {
    const res = unauthorized();
    res.headers.set("Access-Control-Allow-Origin", "*");
    return res;
  }

  const limit = await checkRateLimit(auth.keyId);
  if (!limit.allowed) {
    const res = errorResponse("rate_limited", "Too many requests", 429);
    if (limit.retryAfter != null) {
      res.headers.set("Retry-After", String(limit.retryAfter));
    }
    res.headers.set("Access-Control-Allow-Origin", "*");
    return res;
  }

  const secret = process.env.API_BRIDGE_SECRET;
  if (!secret) {
    return withCors(
      errorResponse("internal_error", "Could not generate upload URL", 500)
    );
  }

  let uploadUrl;
  try {
    uploadUrl = await convexClient().mutation(
      api.apiKeys.generateUploadUrlForUser,
      { secret, userId: auth.userId }
    );
  } catch {
    return withCors(
      errorResponse("internal_error", "Could not generate upload URL", 500)
    );
  }

  return withCors(okResponse({ uploadUrl, expiresInSeconds: 1800 }));
}
