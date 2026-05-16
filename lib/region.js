/**
 * Region resolution — the ONE place that maps a country code to a pricing
 * region. Used by:
 *   - the pricing page / checkout (country from Vercel's x-vercel-ip-country)
 *   - the Polar webhook (country from Polar's collected billing address)
 *
 * Keep this list and lib/plans.js REGIONS in sync. Unknown / missing
 * country → "global" (the higher price) by design: we never give the
 * discount on uncertainty.
 */

import { normalizeRegion, DEFAULT_REGION } from "./plans.js";

/** ISO 3166-1 alpha-2 country code → pricing region. */
const COUNTRY_TO_REGION = {
  IN: "IN",
};

/**
 * @param {string|null|undefined} countryCode - 2-letter ISO code (any case)
 * @returns {"global"|"IN"} a supported region; "global" if unknown/missing
 */
export function regionFromCountry(countryCode) {
  if (!countryCode) return DEFAULT_REGION;
  const cc = String(countryCode).trim().toUpperCase();
  return normalizeRegion(COUNTRY_TO_REGION[cc] || DEFAULT_REGION);
}

/** Vercel injects this header on every request with the client's country. */
export const VERCEL_COUNTRY_HEADER = "x-vercel-ip-country";

/**
 * Read the request's country region from Vercel's geo header. Works in
 * route handlers / server components via the `headers()` API or a Request.
 * Returns "global" locally (header absent) — intended: no discount on
 * unverifiable origin.
 *
 * @param {Headers} headers - a Headers instance (req.headers or next/headers)
 */
export function regionFromHeaders(headers) {
  const cc = headers?.get?.(VERCEL_COUNTRY_HEADER);
  return regionFromCountry(cc);
}
