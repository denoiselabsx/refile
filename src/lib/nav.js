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
  { href: "/presets", label: "Presets", icon: Layers },
  { href: "/workflow", label: "Workflows", icon: Workflow },
  { href: "/settings/api", label: "API", icon: KeyRound },
].filter((item) => !isHiddenLaunchHref(item.href));

/**
 * Marketing top-bar nav — public surfaces only.
 */
export const MARKETING_NAV = [
  { href: "/presets", label: "Presets" },
  { href: "/pricing", label: "Pricing" },
  { href: "/developers", label: "Developers" },
  { href: "/docs", label: "Docs" },
  { href: "/changelog", label: "Changelog" },
].filter((item) => !isHiddenLaunchHref(item.href));

/**
 * Footer columns — used on every marketing page.
 * `external: true` opens in a new tab with rel=noopener,noreferrer.
 */
export const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Chat", href: "/dashboard" },
      { label: "Presets", href: "/presets" },
      { label: "Workflows", href: "/workflow" },
      { label: "Pricing", href: "/pricing" },
      { label: "Developers", href: "/developers" },
      { label: "Changelog", href: "/changelog" },
    ].filter((link) => !isHiddenLaunchHref(link.href)),
  },
  {
    // Surfaces the 20 SEO landing pages so visitors who reach the
    // homepage can browse the conversions directly without typing a
    // /convert/* URL. The "All conversions" link points at the master
    // index which lists every one.
    title: "Convert",
    links: [
      { label: "All conversions", href: "/formats" },
      { label: "MP4 → MP3", href: "/convert/mp4-to-mp3" },
      { label: "MOV → MP4", href: "/convert/mov-to-mp4" },
      { label: "HEIC → JPG", href: "/convert/heic-to-jpg" },
      { label: "PNG → PDF", href: "/convert/png-to-pdf" },
      { label: "Compress PDF", href: "/convert/compress-pdf" },
      { label: "Compress video", href: "/convert/compress-video" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Docs", href: "/docs", icon: BookOpen },
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
