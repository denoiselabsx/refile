import { absoluteUrl } from "@/lib/site";
import {
  DocHeader,
  DocSection,
  DocList,
  DocCallout,
} from "@/components/docs/doc-parts";

export const metadata = {
  title: "Supported formats — Docs",
  description:
    "Every file format and operation ReFile supports, grouped by category: images, video, audio, PDF, documents, archives.",
  alternates: { canonical: absoluteUrl("/docs/formats") },
};

export default function Page() {
  return (
    <>
      <DocHeader
        eyebrow="What ReFile does"
        title="Supported formats"
        intro="Grouped by category. You never type these tool names — just describe the outcome — but here's exactly what's available under the hood."
      />

      <DocSection title="Images">
        <DocList
          items={[
            "Formats: PNG, JPG, WebP, AVIF, HEIC/HEIF, GIF, BMP, TIFF, SVG",
            "Operations: resize, crop, rotate, compress, grayscale/B&W, format conversion, strip EXIF",
            "AI background removal → transparent PNG",
            "SVG → PNG/PDF, HEIC (iPhone) → JPG, animated GIF → WebP",
          ]}
        />
      </DocSection>

      <DocSection title="Video">
        <DocList
          items={[
            "Formats: MP4, MOV, WebM, MKV, AVI",
            "Re-encode (H.264), compress to a target size, resize/scale, change resolution",
            "Trim by time range, extract a frame, make a GIF from a clip",
            "Remux MKV, extract subtitle tracks",
          ]}
        />
      </DocSection>

      <DocSection title="Audio">
        <DocList
          items={[
            "Formats: MP3, WAV, FLAC, OGG, Opus, AAC",
            "Extract audio from video, convert between formats, set bitrate",
            "Change/normalize volume, loudness normalization",
          ]}
        />
      </DocSection>

      <DocSection title="PDF">
        <DocList
          items={[
            "Compress (light or strong), merge multiple PDFs, split / extract page ranges",
            "Remove a password, web-optimize (linearize)",
            "PDF → PNG/JPG (all pages or one), PDF → plain text",
          ]}
        />
      </DocSection>

      <DocSection title="Documents">
        <DocList
          items={[
            "DOCX, PPTX, XLSX, ODT → PDF (layout-preserving)",
            "DOCX → TXT, XLSX → CSV",
            "Markdown ↔ HTML / PDF / DOCX, HTML → PDF",
          ]}
        />
      </DocSection>

      <DocSection title="OCR & data">
        <DocList
          items={[
            "OCR: image → text (English, Hindi, and more)",
            "Some structured-data conversions (CSV/JSON) — with limits, see below",
          ]}
        />
        <DocCallout tone="warn">
          A few data reshaping tasks (e.g. picking specific CSV columns,
          JSON→CSV) need piping/redirection, which the sandbox blocks for
          safety. ReFile will explain in chat rather than emit a broken
          command.
        </DocCallout>
      </DocSection>

      <DocSection title="Archives">
        <DocList
          items={[
            "Extract: ZIP, 7z, TAR, GZ, BZ2, XZ",
            "Create a simple ZIP from a file",
          ]}
        />
        <p>
          See{" "}
          <a
            href="/docs/what-it-can-do"
            className="text-foreground underline-offset-4 hover:underline"
          >
            What it can &amp; can&apos;t do
          </a>{" "}
          for why archives need a little extra context from you.
        </p>
      </DocSection>

      <DocCallout>
        Don&apos;t see your format? Ask in the prompt anyway — if a
        supported tool can do it, ReFile will. If not, it&apos;ll tell you
        plainly.
      </DocCallout>
    </>
  );
}
