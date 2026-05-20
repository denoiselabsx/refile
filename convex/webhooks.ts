"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { createHmac, randomUUID } from "node:crypto";

/* ──────────────────────────────────────────────────────────────── *
 *  API webhook delivery
 *
 *  When an API-submitted job (one with a stored webhookUrl) reaches a
 *  terminal state (completed/failed), we POST the sanitized job shape
 *  to the customer's URL. Best-effort: 3 attempts with 1s / 5s backoff,
 *  10s per-attempt timeout, no row updates on giving up.
 *
 *  Signing: HMAC-SHA256 over the JSON body using API_BRIDGE_SECRET as
 *  the shared key. Consumers verify via X-Refile-Signature.
 * ──────────────────────────────────────────────────────────────── */

export const deliverJobWebhook = internalAction({
  args: { promptId: v.id("prompts") },
  handler: async (ctx, { promptId }) => {
    const secret = process.env.API_BRIDGE_SECRET;
    if (!secret) {
      console.error("[webhook] API_BRIDGE_SECRET not set; cannot deliver");
      return;
    }

    // 1. Cheap lookup: do we even have a webhook URL for this row?
    const meta = await ctx.runQuery(internal.prompts.getWebhookDeliveryInfo, {
      promptId,
    });
    if (!meta || !meta.webhookUrl) return;

    // 2. Build the exact same JSON shape API consumers see from
    //    GET /api/v1/jobs/:id, so the webhook body is a drop-in
    //    replacement for polling.
    const payload = await ctx.runQuery(api.prompts.getForApi, {
      secret,
      promptId,
      userId: meta.userId,
    });
    if (!payload) return;

    const deliveryId = randomUUID();
    const body = JSON.stringify({
      event: "job.settled",
      delivery_id: deliveryId,
      data: payload,
    });
    const signature = createHmac("sha256", secret).update(body).digest("hex");

    const url = meta.webhookUrl;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Refile-Signature": `sha256=${signature}`,
      "X-Refile-Event": "job.settled",
      "X-Refile-Delivery": deliveryId,
    };

    for (let attempt = 0; attempt < 3; attempt++) {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 10_000);
      try {
        const res = await fetch(url, {
          method: "POST",
          headers,
          body,
          signal: ac.signal,
        });
        clearTimeout(timer);
        if (res.ok) {
          console.log(
            `[webhook] delivered ${promptId} on attempt ${attempt + 1}`
          );
          return;
        }
        console.log(
          `[webhook] non-2xx (${res.status}) for ${promptId} attempt ${attempt + 1}`
        );
      } catch (err) {
        clearTimeout(timer);
        console.log(
          `[webhook] error for ${promptId} attempt ${attempt + 1}: ${err}`
        );
      }
      if (attempt < 2) {
        // 1s, then 5s
        await new Promise((r) => setTimeout(r, attempt === 0 ? 1000 : 5000));
      }
    }
    console.log(`[webhook] gave up on ${promptId} after 3 attempts`);
  },
});

