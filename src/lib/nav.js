/**
 * Single source of truth for navigation, brand, and footer links.
 *
 * Anything that renders a nav item — TopBar, AppSidebar, Footer, the chat
 * drawer, command palette — reads from here. Add a new page in one place,
 * see it appear everywhere it should.
 *
 * Note: icon references are lucide-react components, not JSX, so this can
 * be imported by client and server components alike.
 */

import {
  MessageSquare,
  Layers,
  Workflow,
  BookOpen,
  ScrollText,
  CreditCard,
  Users,
  Activity,
  Github,
  Mail,
  Shield,
  FileText,
  Lock,
  KeyRound,
  Boxes,
} from "lucide-react";

/**
 * Presets and Workflows are still in development. While the launch is in
 * flight we hide them from production surfaces (nav, footer, command
 * palette, sitemap, marketing CTAs) and 404 their routes — but keep them
 * fully accessible in dev so we can keep building.
 *
 * To flip the launch: change this to `false` and redeploy. One file.
 */
export const HIDE_LAUNCH_FEATURES = process.env.NODE_ENV === "production";

const HIDDEN_HREFS = new Set(["/presets", "/workflow", "/settings/api"]);

/**
 * True when a nav href points to a feature that's currently hidden in
 * production. Treats /presets/* and /workflow/* as hidden too.
 */
export function isHiddenLaunchHref(href) {
  if (!HIDE_LAUNCH_FEATURES || !href) return false;
  for (const hidden of HIDDEN_HREFS) {
    if (href === hidden || href.startsWith(`${hidden}/`)) return true;
  }
  return false;
}

export const BRAND = {
  name: "ReFile",
  // Shown after the logo on marketing surfaces.
  attribution: "Denoise Labs",
  attributionUrl: "https://denoiselabs.com",
  email: "hello@denoiselabs.com",
  privacyEmail: "privacy@denoiselabs.com",
  securityEmail: "security@denoiselabs.com",
  github: "https://github.com/denoiselabsx/refile",
  tagline: "AI-native file automation",
};

/**
 * Authed app nav — the icon rail on lg+, and the in-drawer list on mobile
 * for the chat surface. Order matters; this is also the rail order.
 */
export const APP_NAV = [
  { href: "/dashboard", label: "Chat", icon: MessageSquare },
  // Convert lives at /convert (public, anon-friendly). /dashboard/quick
  // was the authed-only duplicate of the same page — that route now
  // 308-redirects to /convert. One URL for one product.
  { href: "/convert", label: "Convert", icon: Boxes },
  { href: "/presets", label: "Presets", icon: Layers },
  { href: "/workflow", label: "Workflows", icon: Workflow },
  { href: "/settings/api", label: "API keys", icon: KeyRound },
].filter((item) => !isHiddenLaunchHref(item.href));

/**
 * Marketing top-bar nav — public surfaces only.
 *
 * The order is deliberate and carries the positioning:
 *   1. "Product" — leads with what ReFile IS (AI-native file automation:
 *      chat, workflows, API). Without this, the bar looks like a free
 *      file converter and the differentiated product disappears.
 *   2. "Convert" — the SEO funnel. Mega-menu of every recipe. This is
 *      acquisition, not positioning.
 *   3. "Pricing" — table-stakes for every SaaS.
 *   4. "Docs" — Developers folded in; one bucket for builders.
 *
 * Changelog moved to footer. Presets/Workflows hidden in production
 * via HIDE_LAUNCH_FEATURES — when they launch, they appear in the
 * Product menu automatically (PRODUCT_MENU filters by the same flag).
 *
 * `kind: "menu"` items render a mega-menu trigger instead of a Link.
 */
export const MARKETING_NAV = [
  { kind: "menu", id: "product", label: "Product", href: "/" },
  { kind: "menu", id: "convert", label: "Convert", href: "/convert" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
].filter((item) => !item.href || !isHiddenLaunchHref(item.href));

/**
 * Mega-menu contents for the "Product" top-bar item.
 *
 * Carries the positioning: ReFile is an AI-native file-automation
 * platform. The chat is the headline feature; workflows, presets, and
 * the API extend it. Free conversion lives under Convert.
 *
 * Items hidden by HIDE_LAUNCH_FEATURES are filtered out at runtime so
 * an unlaunched feature never appears in the menu but the production
 * code stays in sync with development.
 */
export const PRODUCT_MENU = [
  {
    title: "Chat",
    href: "/dashboard",
    description:
      "Say what you need done with a file. The right tool runs in the sandbox.",
  },
  {
    title: "Workflows",
    href: "/workflow",
    description: "Chain steps into one reusable pipeline.",
  },
  {
    title: "Presets",
    href: "/presets",
    description:
      "Ready-made recipes for WhatsApp, Instagram, podcasts, more.",
  },
  {
    title: "API",
    href: "/developers",
    description: "Run conversions from your own code or CI.",
  },
].filter((item) => !isHiddenLaunchHref(item.href));

/**
 * Mega-menu contents for the "Convert" top-bar item.
 *
 * Columns map to recipe categories; each column lists the most-searched
 * formats in that category (chosen by SEO intent, not alphabetical).
 * The "All conversions →" footer link lives in the TopBar component so
 * it's consistent across all menus.
 *
 * Picking 4–5 per column keeps the menu scannable in one beat and gives
 * each column ~25 internal-link impressions per pageview — the SEO win
 * of an always-visible mega-menu over a buried catalogue page.
 */
export const CONVERT_MENU = [
  {
    title: "PDF",
    links: [
      { label: "Compress PDF", href: "/convert/compress-pdf" },
      { label: "PDF → Word", href: "/convert/pdf-to-docx" },
      { label: "PDF → JPG", href: "/convert/pdf-to-jpg" },
      { label: "Images → PDF", href: "/convert/images-to-pdf" },
      { label: "Word → PDF", href: "/convert/docx-to-pdf" },
    ],
  },
  {
    title: "Image",
    links: [
      { label: "HEIC → JPG", href: "/convert/heic-to-jpg" },
      { label: "PNG → JPG", href: "/convert/png-to-jpg" },
      { label: "WebP → PNG", href: "/convert/webp-to-png" },
      { label: "JPG → WebP", href: "/convert/jpg-to-webp" },
      { label: "Compress image", href: "/convert/compress-image" },
    ],
  },
  {
    title: "Video",
    links: [
      { label: "Compress video", href: "/convert/compress-video" },
      { label: "MOV → MP4", href: "/convert/mov-to-mp4" },
      { label: "MKV → MP4", href: "/convert/mkv-to-mp4" },
      { label: "WebM → MP4", href: "/convert/webm-to-mp4" },
      { label: "GIF → MP4", href: "/convert/gif-to-mp4" },
    ],
  },
  {
    title: "Audio",
    links: [
      { label: "MP4 → MP3", href: "/convert/mp4-to-mp3" },
      { label: "WAV → MP3", href: "/convert/wav-to-mp3" },
      { label: "M4A → MP3", href: "/convert/m4a-to-mp3" },
      { label: "FLAC → MP3", href: "/convert/flac-to-mp3" },
      { label: "Compress audio", href: "/convert/compress-audio" },
    ],
  },
  {
    title: "Documents",
    links: [
      { label: "Word → PDF", href: "/convert/docx-to-pdf" },
      { label: "Excel → PDF", href: "/convert/xlsx-to-pdf" },
      { label: "PowerPoint → PDF", href: "/convert/pptx-to-pdf" },
      { label: "Word → EPUB", href: "/convert/docx-to-epub" },
      { label: "CSV → Excel", href: "/convert/csv-to-xlsx" },
    ],
  },
];

/**
 * Footer columns — used on every marketing page.
 * `external: true` opens in a new tab with rel=noopener,noreferrer.
 */
export const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Convert", href: "/convert" },
      { label: "Chat", href: "/dashboard" },
      { label: "Presets", href: "/presets" },
      { label: "Workflows", href: "/workflow" },
      { label: "Pricing", href: "/pricing" },
      { label: "Changelog", href: "/changelog" },
    ].filter((link) => !isHiddenLaunchHref(link.href)),
  },
  {
    // Popular conversion landing pages — same six the top-bar mega-menu
    // surfaces, plus the hub. Footer link impressions matter for SEO too.
    title: "Popular conversions",
    links: [
      { label: "All conversions", href: "/convert" },
      { label: "PDF → JPG", href: "/convert/pdf-to-jpg" },
      { label: "HEIC → JPG", href: "/convert/heic-to-jpg" },
      { label: "Word → PDF", href: "/convert/docx-to-pdf" },
      { label: "MOV → MP4", href: "/convert/mov-to-mp4" },
      { label: "Compress PDF", href: "/convert/compress-pdf" },
      { label: "Compress video", href: "/convert/compress-video" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Docs", href: "/docs", icon: BookOpen },
      { label: "Developers", href: "/developers", icon: BookOpen },
      { label: "Community", href: "/community", icon: Users },
      { label: "Status", href: "/status", icon: Activity },
      { label: "GitHub", href: BRAND.github, icon: Github, external: true },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms", href: "/terms", icon: FileText },
      { label: "Privacy", href: "/privacy", icon: Lock },
      { label: "Security", href: "/security", icon: Shield },
    ],
  },
  {
    title: "Contact",
    links: [
      { label: "Email", href: `mailto:${BRAND.email}`, icon: Mail },
      {
        label: "Support",
        href: `mailto:${BRAND.email}?subject=ReFile%20support`,
        icon: Mail,
      },
    ],
  },
];

/**
 * Active-route matcher. A nav item matches when:
 *  - exact match, OR
 *  - the path is a child of the nav item (`/presets/123` matches `/presets`),
 *    but only when the nav item isn't the dashboard root (`/dashboard` should
 *    match `/dashboard/abc` though, which is fine because the rule above
 *    handles both shapes — see tests in commit history if revisiting).
 */
export function isActive(pathname, href) {
  if (!pathname || !href) return false;
  if (pathname === href) return true;
  if (href === "/") return false;
  return pathname.startsWith(`${href}/`);
}
