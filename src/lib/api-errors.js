// Canonical error codes for the public API. Stable contract — do not
// rename or remove codes without a version bump.
export const ERROR_CODES = Object.freeze({
  unauthorized: "unauthorized",
  invalid_request: "invalid_request",
  not_found: "not_found",
  quota_exceeded: "quota_exceeded",
  rate_limited: "rate_limited",
  unprocessable_request: "unprocessable_request",
  no_output: "no_output",
  execution_failed: "execution_failed",
  internal_error: "internal_error",
});

function corsHeaders(extra = {}) {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    ...extra,
  };
}

export function errorResponse(code, message, status, extraHeaders) {
  return new Response(
    JSON.stringify({ error: { code, message } }),
    { status, headers: corsHeaders(extraHeaders) }
  );
}

export function okResponse(data, status = 200, extraHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(extraHeaders),
  });
}
