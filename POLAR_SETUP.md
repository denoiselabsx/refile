# Polar Billing Setup

ReFile's billing is wired but **inert until you provision Polar and set env
vars**. Until then the app behaves exactly as before: quotas are enforced
locally (Convex `userUsage`), nothing is charged, and the Polar ingest call
is a silent no-op. Do these steps in order.

## 0. Concept (read this first)

- **Free** has no Polar product — it's the *absence* of a subscription.
- **Student / Pro / Power** are Polar **subscription products**.
- Included conversions are a Polar **Meter Credits benefit** on each product.
- Overage is a **metered price** on each product driven by one **Meter**.
- One conversion = one Polar **event** named `conversion`, ingested by
  `convex/runJob.ts` only on a successful conversion, deduped by `promptId`.
- The Convex user id is set as the Polar customer **`external_id`** at
  checkout, so every subscription webhook maps back to the right user.

The numbers (15 / 100 / 750 / 3000 conversions, $0.02 overage, file caps)
live in `lib/plans.js` — the single source of truth. Mirror them in the
Polar dashboard; if they ever disagree, `lib/plans.js` is what the app
enforces and displays.

## 1. Create the Polar organization (sandbox first)

1. Sign up at https://sandbox.polar.sh (sandbox is a separate environment
   from production — separate accounts, separate tokens).
2. Create an Organization.

## 2. Create the conversions Meter

Dashboard → **Meters → Create Meter**:

- **Name:** Conversions
- **Filter:** event `name` **equals** `conversion`
  (must match `POLAR_CONVERSION_EVENT`, default `conversion`)
- **Aggregation:** **Sum** over metadata field `conversions`
  (each event sends `metadata.conversions = 1`)

## 3. Create SIX Products (regional pricing)

Pricing is regional: a **global** set and an **India (PPP)** set. Quotas are
**identical** across regions — only the monthly price differs. Create all
six recurring monthly subscription products:

| Product | Price | Env var |
|---|---|---|
| Student (global) | **$4/mo** | `POLAR_PRODUCT_STUDENT` |
| Pro (global) | **$7/mo** | `POLAR_PRODUCT_PRO` |
| Power (global) | **$20/mo** | `POLAR_PRODUCT_POWER` |
| Student (India) | **$2/mo** | `POLAR_PRODUCT_STUDENT_IN` |
| Pro (India) | **$5/mo** | `POLAR_PRODUCT_PRO_IN` |
| Power (India) | **$15/mo** | `POLAR_PRODUCT_POWER_IN` |

On **every** product (all six):

1. **Base price:** the monthly price from the table.
2. **Metered price:** a usage price bound to the **Conversions** meter at
   **$0.02 per unit** (Scalar). Same overage rate in both regions.
3. **Meter Credits benefit** granted each cycle on the Conversions meter —
   **same for global and India** (quotas don't change by region):
   - Student → **100**, Pro → **750**, Power → **3000**.

   (Polar then bills only conversions beyond the included amount, matching
   `computeOverage` in `lib/plans.js`.)

Copy all six product **IDs** for the env vars below.

> Prices are USD in both regions (Polar/Stripe is card-only; no INR/UPI).
> India users simply pay a lower USD amount.

## 4. Get an Access Token

Dashboard → **Settings → Developers → New Token**. Organization-scoped,
with permissions for checkouts, customers, subscriptions, and events.
Copy it once (shown only once).

## 5. Configure the Webhook

Dashboard → **Settings → Webhooks → Add Endpoint**:

- **URL:** `https://YOUR_APP_DOMAIN/api/webhook/polar`
  (for local testing use a tunnel, e.g. `ngrok http 3000`, and use the
  tunnel URL)
- **Events:** at minimum `subscription.active`, `subscription.updated`,
  `subscription.canceled`, `subscription.revoked`.
- Copy the **signing secret**.

## 6. Set environment variables

### Next.js (`.env.local`, and your host's env in prod)

```
POLAR_SERVER=sandbox
POLAR_ACCESS_TOKEN=polar_oat_...
POLAR_WEBHOOK_SECRET=whsec_...
POLAR_WEBHOOK_BRIDGE_SECRET=<any long random string you generate>
POLAR_PRODUCT_STUDENT=<student global product id>
POLAR_PRODUCT_PRO=<pro global product id>
POLAR_PRODUCT_POWER=<power global product id>
POLAR_PRODUCT_STUDENT_IN=<student India product id>
POLAR_PRODUCT_PRO_IN=<pro India product id>
POLAR_PRODUCT_POWER_IN=<power India product id>
POLAR_CONVERSION_EVENT=conversion
```

If an `*_IN` var is unset, India visitors simply can't check out that
tier (the route redirects back to /pricing). Global vars are the minimum
to launch; add India ones when ready.

### Convex deployment (so `runJob` can ingest usage events)

`runJob` runs on Convex, not Next.js, so it needs its own copy:

```
npx convex env set POLAR_ACCESS_TOKEN polar_oat_...
npx convex env set POLAR_SERVER sandbox
npx convex env set POLAR_CONVERSION_EVENT conversion
npx convex env set POLAR_WEBHOOK_BRIDGE_SECRET <same value as Next.js>
```

`POLAR_WEBHOOK_BRIDGE_SECRET` MUST be identical in both places — the
webhook route sends it and the Convex `applyPolarSubscription` mutation
checks it. Mismatch = every webhook rejected.

## 7. Test in sandbox (end-to-end)

1. `npm run dev`, tunnel it, point the Polar webhook at the tunnel.
2. Sign in to the app, go to **/pricing**, pick **Pro**.
3. You're redirected to Polar's hosted checkout. Use a Polar **sandbox test
   card** (see Polar docs → Testing) to complete it.
4. Polar fires `subscription.active` → `/api/webhook/polar` → Convex
   `applyPolarSubscription`. Confirm in the Convex dashboard that the
   user's `userPlans.plan` flipped to `pro` and `polarCustomerId` is set.
5. The sidebar usage meter should now show **Pro · 750 included**.
6. Run a conversion. Confirm in the Convex `prompts` row that
   `billedToPolar: true`, and in Polar that a `conversion` event landed on
   the Conversions meter.
7. Open **/pricing** while on Pro → the card shows **Manage plan** → opens
   the Polar Customer Portal. Cancel there → `subscription.revoked` →
   user drops back to **Free**.

## 8. Go to production

Repeat 1–6 against https://polar.sh (production), with production product
IDs / token / webhook secret, and set `POLAR_SERVER=production` in **both**
Next.js and Convex env. Re-test one real (small) transaction before
announcing.

---

## Regional (India) pricing — how it works & how to test

**Detection (server-side, never trusts the client):**

- The pricing page and the checkout route both read Vercel's
  `x-vercel-ip-country` header. `IN` → India region; anything else or
  missing → `global` (the higher price). Logic is in `lib/region.js`.
- ⚠️ This header is **only present on Vercel deployments**. Locally and
  behind a non-Enterprise proxy it's absent → everyone sees global
  pricing. To test India pricing you must deploy to Vercel (or a Vercel
  preview) and request from an Indian IP / VPN.

**Verification (the anti-abuse part):**

1. Checkout forces Polar to collect a billing address
   (`requireBillingAddress`).
2. The webhook reads the purchased product → `{plan, region}` and the
   Polar **billing country** → expected region.
3. If they bought an **India-priced** product but the billing country is
   **not India**, that's the IP-spoof case. Polar already charged the
   India price (we can't reverse that), so the webhook:
   - forces their stored `region` to `global` (renewals + overage bill at
     the global rate going forward), and
   - sets `userPlans.regionMismatch = true` for review.

   This is a *pricing-integrity* action only — quotas are identical across
   regions, so the user loses no features, just the discount on renewal.

**Testing the mismatch path in sandbox:** complete an India-product
checkout but enter a non-IN billing address on Polar's checkout page.
Confirm in the Convex dashboard that the user's `region` is `global` and
`regionMismatch` is `true`.

**Honest limitation:** a determined abuser with an Indian VPN *and* a
matching fake/Indian billing address still gets the India price — there is
no card-BIN check (Polar's API exposes no country-lock on checkout, see
research notes). This stops casual abuse, not a determined one. If India
abuse becomes material, the next lever is a separate India processor
(Razorpay) with real KYC — out of scope here.

---

## Design notes / known limitations

- **Local quota is still the gate.** Polar never blocks on balance (their
  docs are explicit). Enforcement stays in `convex/prompts.ts`
  `assertWithinQuota`. Polar only *charges*; it does not gate.
- **Idempotency is layered:** `prompts.billedToPolar` flag (skip if set) +
  Polar event `externalId = promptId`. A `runJob` retry cannot double-bill.
- **Polar outage is non-fatal:** if event ingestion throws, the user's
  conversion still succeeds; the error is logged and `billedToPolar` stays
  false so it can be reconciled/retried later. There is **no automatic
  backfill job yet** — if you have a long Polar outage, unsent events must
  be reconciled from `userUsage` manually. (Future: a cron that re-ingests
  un-billed succeeded prompts.)
- **Webhook payload shape** is read defensively in
  `app/api/webhook/polar/route.js` (`readSubscription`) because Polar's
  exact TS subscription schema wasn't pinned at build time. If a future
  Polar SDK changes field names, that one function is the only place to
  adjust.
- **The $2 Student tier is thin after fees.** Polar's MoR fee (~4% + 40¢,
  +0.5% subscription) means ~$1.51 net on $2. This was flagged during
  design; revisit Student pricing (or make it annual) before launch.
- **No Stripe fallback.** Polar is merchant-of-record; it also handles VAT/
  sales tax, which is the main reason it was chosen over raw Stripe.
