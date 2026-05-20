import { authenticate, unauthorized } from "@/lib/api-auth";
import { errorResponse, okResponse } from "@/lib/api-errors";
import { checkRateLimit } from "@/lib/api-rate-limit";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";

export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
};

function withCors(response) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  return response;
}

function convexClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
  return new ConvexHttpClient(url);
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request, { params }) {
  const auth = await authenticate(request);
  if (!auth) return withCors(unauthorized());

  const rl = await checkRateLimit(auth.keyId);
  if (!rl.allowed) {
    const res = errorResponse("rate_limited", "Too many requests", 429);
    if (rl.retryAfter != null) {
      res.headers.set("Retry-After", String(rl.retryAfter));
    }
    return withCors(res);
  }

  const { id } = await params;
  if (typeof id !== "string" || id.length === 0) {
    return withCors(errorResponse("invalid_request", "Job id is required", 400));
  }

  const secret = process.env.API_BRIDGE_SECRET;
  if (!secret) {
    console.error("[api/v1/jobs/:id] API_BRIDGE_SECRET not set");
    return withCors(errorResponse("internal_error", "Could not fetch job", 500));
  }

  let job;
  try {
    job = await convexClient().query(api.prompts.getForApi, {
      secret,
      promptId: id,
      userId: auth.userId,
    });
  } catch (err) {
    const s = String(err?.message ?? err ?? "");
    // Convex's v.id() validator rejects any id whose table-tag prefix
    // doesn't match — so typos and "doesn't exist" are indistinguishable
    // to the caller. Surface both as 404, which matches REST norms.
    if (s.includes("ArgumentValidationError") && s.includes(".promptId")) {
      return withCors(errorResponse("not_found", "Job not found", 404));
    }
    console.error("[api/v1/jobs/:id] getForApi failed:", err);
    return withCors(errorResponse("internal_error", "Could not fetch job", 500));
  }

  if (!job) return withCors(errorResponse("not_found", "Job not found", 404));
  return withCors(okResponse(job, 200));
}
