import { SITE_URL } from "@/lib/site";
import { HIDE_LAUNCH_FEATURES } from "@/lib/nav";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard",
          "/dashboard/",
          "/presets/create",
          "/workflow",
          "/login",
          "/login/",
          ...(HIDE_LAUNCH_FEATURES ? ["/presets", "/presets/"] : []),
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
