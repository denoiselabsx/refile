import { Google } from "arctic";

let _client = null;

function buildClient() {
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error(
      "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local."
    );
  }
  const callbackBase =
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return new Google(id, secret, `${callbackBase}/login/google/callback`);
}

export const google = new Proxy(
  {},
  {
    get(_target, prop) {
      if (!_client) _client = buildClient();
      const value = _client[prop];
      return typeof value === "function" ? value.bind(_client) : value;
    },
  }
);
