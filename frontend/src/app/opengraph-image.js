import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "ReFile — AI-native file automation";

export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background:
            "radial-gradient(ellipse at top, #1f1f1f 0%, #0c0c0c 70%)",
          color: "#fafafa",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        {/* Top: brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: "-0.02em",
              }}
            >
              R
            </div>
            <span
              style={{
                fontSize: 26,
                fontWeight: 600,
                letterSpacing: "-0.02em",
              }}
            >
              ReFile
            </span>
          </div>
          <span
            style={{
              fontSize: 14,
              color: "rgba(250,250,250,0.55)",
              letterSpacing: "0.04em",
            }}
          >
            A Denoise Labs product
          </span>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <p
            style={{
              fontSize: 14,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: "rgba(250,250,250,0.55)",
              margin: 0,
            }}
          >
            AI-native file automation
          </p>
          <h1
            style={{
              fontSize: 80,
              fontWeight: 600,
              letterSpacing: "-0.035em",
              lineHeight: 1.02,
              margin: 0,
              maxWidth: 980,
            }}
          >
            Describe the file you want.{" "}
            <span style={{ color: "rgba(250,250,250,0.55)" }}>
              We write the command.
            </span>
          </h1>
        </div>

        {/* Bottom: command preview */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            padding: "18px 22px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 14,
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            fontSize: 22,
            color: "rgba(250,250,250,0.92)",
          }}
        >
          <span style={{ fontSize: 14, color: "rgba(250,250,250,0.5)" }}>
            $ ffmpeg
          </span>
          <span>ffmpeg -i in.mp4 -vn -ab 192k -ar 44100 -y out.mp3</span>
        </div>
      </div>
    ),
    size
  );
}
