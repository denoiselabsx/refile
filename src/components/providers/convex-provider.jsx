"use client";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";

// Use a placeholder URL if env is missing — the client won't actually
// connect, but the provider tree is in place so `useQuery` doesn't crash.
const CONVEX_URL =
  process.env.NEXT_PUBLIC_CONVEX_URL || "https://placeholder.convex.cloud";

let _client = null;
function getConvex() {
  if (!_client) _client = new ConvexReactClient(CONVEX_URL);
  return _client;
}

export function ConvexClientProvider({ children }) {
  return <ConvexAuthProvider client={getConvex()}>{children}</ConvexAuthProvider>;
}
