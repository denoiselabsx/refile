/**
 * Dynamic OG image per recipe — rendered at build time, one PNG per slug.
 *
 * Why dynamic per-slug instead of one shared image:
 *   • Twitter/X, Slack, LinkedIn previews of /convert/heic-to-jpg now
 *     show "HEIC → JPG" not a generic ReFile card. CTR on shared links
 *     jumps significantly when the preview is specific.
 *   • Each recipe page becomes its own miniature landing page in the
 *     social graph — every share is a topical ad for that exact format.
 *   • Generated at build, not on request, so zero runtime cost.
 *
 * Uses Next.js ImageResponse — Satori-rendered JSX → PNG. Restricted
 * CSS support (no custom fonts unless fetched), so the design is tonal
 * and typography-led, matching the on-page brand.
 */

import { ImageResponse } from "next/og";
import { getConversion } from "@/lib/conversions";

export const runtime = "nodejs";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };
export const alt = "ReFile — file conversion";

export default async function OgImage({ params }) {
  const { slug } = await params;
  const c = getConversion(slug);

  // Defensive: if a slug somehow has no entry, render the brand fallback
  // rather than failing the route. Build won't break either way.
  const fromText = (c?.from || "FILE").toUpperCase();
  const toText = (c?.to || "FILE").toUpperCase();
  const titleLine = c
    ? c.title.replace(" Online — Free", "")
    : "Free file converter";
  const subLine = c
    ? `${c.intro.split(".")[0]}.`
    : "Convert any file format — no signup required.";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(135deg, #0a0a0a 0%, #121212 60%, #1a1a1a 100%)",
          color: "#fafafa",
          padding: "72px 80px",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        {/* Top row: brand + format chips */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontSize: 26,
              fontWeight: 600,
              letterSpacing: "-0.01em",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: "#fafafa",
                color: "#0a0a0a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 22,
              }}
            >
              R
            </div>
            <span>ReFile</span>
          </div>

          {/* Format pair chip */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "12px 22px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "0.04em",
              fontFamily: "ui-monospace, SF Mono, Menlo, monospace",
            }}
          >
            <span style={{ color: "#e5e5e5" }}>{fromText}</span>
            <span style={{ color: "rgba(255,255,255,0.4)" }}>→</span>
            <span
              style={{
                color: "#0a0a0a",
                background: "#fafafa",
                padding: "4px 12px",
                borderRadius: 6,
              }}
            >
              {toText}
            </span>
          </div>
        </div>

        {/* Title + sub */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
            maxWidth: 1040,
          }}
        >
          <div
            style={{
              fontSize: 80,
              lineHeight: 1.05,
              fontWeight: 600,
              letterSpacing: "-0.025em",
              color: "#fafafa",
            }}
          >
            {titleLine}
          </div>
          <div
            style={{
              fontSize: 28,
              lineHeight: 1.4,
              color: "rgba(250,250,250,0.65)",
              fontWeight: 400,
            }}
          >
            {subLine}
          </div>
        </div>

        {/* Footer chips */}
        <div
          style={{
            display: "flex",
            gap: 12,
            fontSize: 19,
            color: "rgba(250,250,250,0.6)",
          }}
        >
          {[
            "No signup",
            "No watermark",
            "Files deleted in 24h",
          ].map((chip) => (
            <div
              key={chip}
              style={{
                padding: "10px 18px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {chip}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
