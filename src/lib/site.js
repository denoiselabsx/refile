/**
 * Single source of truth for site URL and brand metadata.
 * Used by metadata generators, sitemap, robots, OG images, and JSON-LD.
 *
 * Set NEXT_PUBLIC_APP_URL on Vercel to the canonical domain.
 */
import pkg from "../../package.json";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL || "https://refile.denoiselabs.com"
).replace(/\/$/, "");

/**
 * Current product version, sourced from package.json so the landing
 * pill, footer, and any "What's new" banner can never drift apart.
 * Bumping package.json's version is the single point of update —
 * which `npm version <type>` does for us at release time.
 */
export const APP_VERSION = `v${pkg.version}`;

export const SITE = {
  name: "ReFile",
  tagline: "AI-native file automation",
  // Canonical product description — used in metadata, OG, and JSON-LD.
  description:
    "ReFile is an AI designed to translate natural-language file requests into single-line Linux shell commands for file operations within a sandboxed Debian container, or answer questions in chat mode.",
  // Shorter version for OG cards / Twitter where space is tight.
  shortDescription:
    "Describe what you want. ReFile writes the exact ffmpeg / ImageMagick / Ghostscript command, runs it in a sandbox, returns the file.",
  keywords: [
    "AI file conversion",
    "ffmpeg AI",
    "ImageMagick AI",
    "PDF compression AI",
    "shell command generator",
    "natural language file automation",
    "AI image converter",
    "AI video converter",
    "AI PDF tools",
    "convert files with AI",
    "linux shell command AI",
    "sandboxed file processing",
  ],
  twitter: "@refileapp",
  publisher: "Denoise Labs",
  url: SITE_URL,
  ogImage: `${SITE_URL}/opengraph-image`,
};

export const absoluteUrl = (path = "/") =>
  `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
