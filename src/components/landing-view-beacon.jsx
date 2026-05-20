"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

/**
 * Fires `landing_view` exactly once per mount for the parent conversion
 * page. Keeps the parent page server-rendered (good for SEO) while still
 * letting us count organic landing traffic in the admin dashboard.
 */
export function LandingViewBeacon({ slug, from, to }) {
  useEffect(() => {
    track("landing_view", { slug, from, to });
    // Empty deps — we want exactly one event per page mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
