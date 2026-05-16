/**
 * Region resolution — the ONE place that maps a request's geo to a pricing
 * region. Used by:
 *   - the pricing page + checkout (geo from Vercel IP headers)
 *   - the Polar webhook (country from Polar's collected billing address)
 *
 * Production trust model (Vercel-hosted):
 *  - `x-vercel-ip-country` is injected by Vercel's edge on EVERY request from
 *    the requester's IP. Vercel overwrites `x-forwarded-for` and does not
 *    forward external IPs (anti-spoofing), so this header cannot be forged by
 *    a normal client — it reflects the real connecting IP.
 *  - EXCEPTION: if an Enterprise "Trusted Proxy" sits in front, Vercel honors
 *    a custom X-Forwarded-For and geo headers may reflect the proxy. Not our
 *    setup; noted so a future change here is deliberate.
 *  - Locally / non-Vercel / behind a tunnel (ngrok) these headers are ABSENT
 *    → we resolve "global" (never grant the discount on uncertainty).
 *
 * Robustness: country is primary. Continent is a corroborating signal only —
 * it can never *upgrade* an unknown country into a discounted region, it only
 * guards against a malformed/empty country header silently mispricing. The
 * discount is still gated on the country actually matching.
 *
 * Whatever this resolves is re-verified downstream against Polar's collected
 * billing country in the webhook (region-mismatch → forced to global).
 */

import { normalizeRegion, DEFAULT_REGION } from "./plans.js";

/** ISO 3166-1 alpha-2 country code → pricing region. Keep in sync with
 * lib/plans.js REGIONS. */
const COUNTRY_TO_REGION = {
  IN: "IN",
};

/** ISO 3166-1 alpha-2 country codes considered valid (2 uppercase letters). */
const COUNTRY_RE = /^[A-Z]{2}$/;

/** Vercel geo headers (present on every prod request; absent locally). */
export const VERCEL_COUNTRY_HEADER = "x-vercel-ip-country";
export const VERCEL_CONTINENT_HEADER = "x-vercel-ip-continent";

/**
 * Map a country code to a pricing region.
 * @param {string|null|undefined} countryCode - 2-letter ISO code (any case)
 * @returns {"global"|"IN"} a supported region; "global" if unknown/missing
 */
export function regionFromCountry(countryCode) {
  if (!countryCode) return DEFAULT_REGION;
  const cc = String(countryCode).trim().toUpperCase();
  if (!COUNTRY_RE.test(cc)) return DEFAULT_REGION; // malformed → no discount
  return normalizeRegion(COUNTRY_TO_REGION[cc] || DEFAULT_REGION);
}

/**
 * Resolve the pricing region from a request's Vercel geo headers.
 *
 * Primary signal: x-vercel-ip-country. The continent header is only used to
 * DETECT a suspicious state (country resolves to a discounted region but the
 * continent doesn't agree — e.g. spoof attempt or geo glitch) and, in that
 * case, fall back to global. It never creates a discount on its own.
 *
 * @param {Headers} headers - a Headers instance (req.headers / next/headers)
 * @returns {"global"|"IN"}
 */
export function regionFromHeaders(headers) {
  const get = headers?.get?.bind(headers);
  if (!get) return DEFAULT_REGION;

  // DEV-ONLY override so region logic is testable without a Vercel deploy
  // (locally / ngrok there is no x-vercel-ip-country, so it'd always be
  // global). Set DEV_FORCE_REGION=IN in .env.local to simulate India.
  // HARD-GATED to non-production: a forced region is IGNORED when
  // NODE_ENV === "production", so it can never leak a discount in prod
  // even if the var is accidentally set on the deployment.
  if (process.env.NODE_ENV !== "production" && process.env.DEV_FORCE_REGION) {
    return normalizeRegion(process.env.DEV_FORCE_REGION);
  }

  const country = get(VERCEL_COUNTRY_HEADER);
  const region = regionFromCountry(country);
  if (region === DEFAULT_REGION) return DEFAULT_REGION;

  // region is discounted (e.g. IN). Corroborate with continent if present.
  const continent = (get(VERCEL_CONTINENT_HEADER) || "").trim().toUpperCase();
  if (continent && region === "IN" && continent !== "AS") {
    // Country says India but continent isn't Asia — inconsistent. Don't
    // grant the discount; the webhook billing-country check is the final
    // word anyway, but we avoid showing a wrong price up front.
    return DEFAULT_REGION;
  }

  return region;
}
