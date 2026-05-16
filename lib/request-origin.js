/**
 * Resolve the PUBLIC origin of an incoming request.
 *
 * Behind a tunnel/proxy (ngrok, Vercel, a load balancer), `new URL(req.url)`
 * frequently reports the *internal* address (e.g. http://localhost:3000)
 * because the proxy forwards to localhost. Using that for redirect targets
 * (Polar successUrl/returnUrl, OAuth callbacks) bounces the user back to
 * localhost — unreachable for them.
 *
 * The proxy tells us the real host/proto via standard forwarded headers.
 * Prefer those; fall back to the request URL's own origin; finally fall
 * back to NEXT_PUBLIC_APP_URL.
 *
 * @param {Request} req - the incoming request (has .url and .headers)
 * @returns {string} origin like "https://abc.ngrok-free.dev" (no trailing /)
 */
export function publicOrigin(req) {
  const h = req.headers;

  // PRODUCTION: if NEXT_PUBLIC_APP_URL is an explicit https origin, trust it
  // outright. On Vercel this is set to the canonical domain, so redirects are
  // deterministic and immune to any forwarded-header edge case. We only skip
  // it when it's the localhost dev placeholder (then fall through to headers,
  // which is what makes ngrok work in dev).
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "");
  if (/^https:\/\/[^/]+$/.test(appUrl) && !appUrl.includes("localhost")) {
    return appUrl;
  }

  // ngrok / most proxies set x-forwarded-host (may be a comma list; take 1st)
  const fwdHost = h.get("x-forwarded-host");
  const fwdProto = h.get("x-forwarded-proto");
  if (fwdHost) {
    const host = fwdHost.split(",")[0].trim();
    const proto = (fwdProto?.split(",")[0].trim() || "https").replace(
      /[^a-z]/g,
      ""
    );
    return `${proto}://${host}`;
  }

  // No forwarded headers — use the request's own origin if it's not the
  // internal localhost address.
  try {
    const u = new URL(req.url);
    if (!/^localhost(:\d+)?$/.test(u.host) && u.host) {
      return u.origin;
    }
  } catch {
    /* fall through */
  }

  // Last resort: the configured app URL (already computed + trimmed above),
  // or the localhost dev default if it wasn't set.
  return appUrl || "http://localhost:3000";
}
