import { NextResponse } from "next/server";
import { CustomerPortal } from "@polar-sh/nextjs";
import { polarServer } from "../../../../lib/polar.js";

export const runtime = "nodejs";

/**
 * Opens the Polar Customer Portal so a subscriber can manage / cancel their
 * plan and see invoices.
 *
 * Called as: /api/portal?customerId=<polarCustomerId>
 *
 * The client resolves its own Polar customer id first via the authenticated
 * Convex query api.plans.myPolarCustomerId (so only the signed-in owner can
 * obtain it) and passes it here. The portal session itself is short-lived
 * and scoped to that one customer by Polar.
 */
export async function GET(req) {
  const { searchParams, origin } = new URL(req.url);
  const customerId = searchParams.get("customerId");

  if (!customerId) {
    // No subscription yet — send them to pricing instead of a dead portal.
    return NextResponse.redirect(`${origin}/pricing`);
  }

  const handler = CustomerPortal({
    accessToken: process.env.POLAR_ACCESS_TOKEN,
    server: polarServer(),
    getCustomerId: async () => customerId,
    returnUrl: `${origin}/dashboard`,
  });

  return handler(req);
}
