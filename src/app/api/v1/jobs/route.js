import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { authenticate, unauthorized } from "@/lib/api-auth";
import { errorResponse, okResponse } from "@/lib/api-errors";
import { checkRateLimit } from "@/lib/api-rate-limit";

export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

const QUOTA_PATTERNS = [
  "plan allows",
  "exceeds",
  "monthly limit",
  "Quota exceeded",
  "[[UPGRADE:",
  "caps files at",
  "free conversions",
];

function isQuotaError(err) {
  const s = String(err?.message ?? err ?? "");
  return QUOTA_PATTERNS.some((p) => s.includes(p));
}

function isPaymentRequiredError(err) {
  const s = String(err?.message ?? err ?? "");
  return s.includes("[[PAYMENT:");
}

function stripPaymentTag(msg) {
  // Remove the [[PAYMENT:...]] sentinel from the user-facing message so the
  // 402 body reads cleanly. Internal tag stays in server logs (via the
  // original error) for diagnostics.
  return msg.replace(/\[\[PAYMENT:[^\]]+\]\]\s*/g, "").trim();
}

function extractOriginalMessage(err) {
  const s = String(err?.message ?? err ?? "");
  const m = s.match(/Uncaught Error:\s*(.+?)(?:\n|$)/);
  return (m ? m[1] : s).trim();
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request) {
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

  let body;
  try {
    body = await request.json();
  } catch {
    return withCors(errorResponse("invalid_request", "Body must be valid JSON", 400));
  }

  if (!body || typeof body !== "object") {
    return withCors(errorResponse("invalid_request", "Body must be a JSON object", 400));
  }

  const { prompt, files, webhook_url, chat_id } = body;

  if (typeof prompt !== "string" || prompt.length === 0) {
    return withCors(errorResponse("invalid_request", "prompt must be a non-empty string", 400));
  }
  if (prompt.length > 2000) {
    return withCors(errorResponse("invalid_request", "prompt must be ≤ 2000 characters", 400));
  }

  let fileList = [];
  if (files != null) {
    if (!Array.isArray(files)) {
      return withCors(errorResponse("invalid_request", "files must be an array", 400));
    }
    if (files.length > 50) {
      return withCors(errorResponse("invalid_request", "files must contain ≤ 50 items", 400));
    }
    for (const f of files) {
      if (!f || typeof f !== "object" || typeof f.storageId !== "string" || typeof f.filename !== "string") {
        return withCors(errorResponse("invalid_request", "each file must be { storageId: string, filename: string }", 400));
      }
    }
    fileList = files;
  }

  if (webhook_url != null) {
    if (typeof webhook_url !== "string" || webhook_url.length > 500 || !(webhook_url.startsWith("https://") || webhook_url.startsWith("http://"))) {
      return withCors(errorResponse("invalid_request", "webhook_url must be an http(s) URL ≤ 500 chars", 400));
    }
  }

  if (chat_id != null && typeof chat_id !== "string") {
    return withCors(errorResponse("invalid_request", "chat_id must be a string", 400));
  }

  const secret = process.env.API_BRIDGE_SECRET;
  if (!secret) {
    console.error("[api/v1/jobs] API_BRIDGE_SECRET not set");
    return withCors(errorResponse("internal_error", "Could not submit job", 500));
  }

  let submitted;
  try {
    submitted = await convexClient().mutation(api.prompts.submitForUser, {
      secret,
      userId: auth.userId,
      prompt,
      inputStorageIds: fileList.map((f) => f.storageId),
      inputFilenames: fileList.map((f) => f.filename),
      chatId: chat_id || undefined,
      webhookUrl: webhook_url || undefined,
    });
  } catch (err) {
    // payment_required wins over quota_exceeded — both can match (e.g. an
    // API-free-trial user oversizing a file), but the actionable answer is
    // "add a payment method" before "upgrade your plan".
    if (isPaymentRequiredError(err)) {
      return withCors(
        errorResponse(
          "payment_required",
          stripPaymentTag(extractOriginalMessage(err)),
          402
        )
      );
    }
    if (isQuotaError(err)) {
      return withCors(errorResponse("quota_exceeded", extractOriginalMessage(err), 402));
    }
    console.error("[api/v1/jobs] submitForUser failed:", err);
    return withCors(errorResponse("internal_error", "Could not submit job", 500));
  }

  const { promptId, chatId } = submitted;
  const wait = new URL(request.url).searchParams.get("wait") === "true";

  if (!wait) {
    return withCors(
      okResponse({ id: promptId, status: "pending", chat_id: chatId }, 202)
    );
  }

  // Vercel function timeouts default to 300s; we cap at 25s to keep the
  // request snappy and let the client poll thereafter.
  const deadline = Date.now() + 25_000;
  const client = convexClient();
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 600));
    let job;
    try {
      job = await client.query(api.prompts.getForApi, {
        secret,
        promptId,
        userId: auth.userId,
      });
    } catch (err) {
      console.error("[api/v1/jobs] getForApi poll failed:", err);
      continue;
    }
    if (job && (job.status === "succeeded" || job.status === "failed")) {
      return withCors(okResponse(job, 200));
    }
  }

  return withCors(
    okResponse(
      {
        id: promptId,
        status: "running",
        chat_id: chatId,
        polling: { hint: "Job is still running. Poll GET /api/v1/jobs/:id." },
      },
      202
    )
  );
}
