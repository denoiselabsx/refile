import { SITE } from "@/lib/site";

export default function manifest() {
  return {
    name: SITE.name,
    short_name: SITE.name,
    description: SITE.shortDescription,
    start_url: "/",
    display: "standalone",
    background_color: "#0f0f0f",
    theme_color: "#0f0f0f",
    orientation: "portrait",
    categories: ["productivity", "developer", "utilities"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.png", sizes: "32x32", type: "image/png", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png", purpose: "maskable" },
    ],
  };
}
