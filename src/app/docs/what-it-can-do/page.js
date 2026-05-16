import { absoluteUrl } from "@/lib/site";
import {
  DocHeader,
  DocSection,
  CapabilityGrid,
  DocCallout,
} from "@/components/docs/doc-parts";

export const metadata = {
  title: "What ReFile can & can't do — Docs",
  description:
    "An honest, exact list of what ReFile can and cannot do — so you never waste a conversion on something it won't do.",
  alternates: { canonical: absoluteUrl("/docs/what-it-can-do") },
};

export default function Page() {
  return (
    <>
      <DocHeader
        eyebrow="What ReFile does"
        title="What it can & can’t do"
        intro="ReFile runs one well-chosen command per request inside a locked-down sandbox. That makes it fast and safe — but it also draws hard lines. Here they are, plainly."
      />

      <DocSection title="The short version">
        <p>
          ReFile is excellent at <strong>single-step file operations</strong>
          : convert, compress, resize, crop, rotate, merge, split, extract,
          transcribe, OCR, remove backgrounds, strip metadata. It is{" "}
          <strong>not</strong> a general assistant, a code runner, or a
          multi-step pipeline engine.
        </p>
      </DocSection>

      <DocSection title="Files & operations">
        <CapabilityGrid
          can={[
            "Images: convert, resize, crop, rotate, compress, grayscale, format-swap (PNG/JPG/WebP/AVIF/HEIC/SVG)",
            "Video: re-encode, compress, resize, trim, extract frames, make GIFs, remux",
            "Audio: convert, extract from video, change volume, normalize, re-encode",
            "PDF: compress, merge, split, extract pages, remove passwords, PDF→image, PDF→text",
            "Documents: DOCX/PPTX/XLSX/ODT/MD/HTML conversions (to PDF, text, etc.)",
            "OCR text out of images, AI background removal, EXIF/metadata stripping",
            "Archives: extract zip/7z/tar/gz (with caveats below)",
          ]}
          cannot={[
            "Run arbitrary code (Python, shell scripts, etc.)",
            "Chain multiple tools in one request (no pipelines / multi-step)",
            "Anything needing the internet (no downloading from a URL)",
            "Edit file contents semantically (“rewrite this essay”, “fix this code”)",
            "Tasks that require redirection or piping (some data/CSV reshaping)",
            "Guarantee exact output file size to the byte (it targets, closely)",
            "General Q&A, coding help, or non-file requests",
          ]}
        />
      </DocSection>

      <DocSection title="One request = one operation">
        <p>
          Every request becomes exactly{" "}
          <strong>one command, run once</strong>. If a task genuinely needs
          two tools or two steps (“convert this then compress it then
          watermark it”), ReFile will tell you in chat rather than do it
          wrong. Do it as separate requests — a follow-up like “now
          compress it” reuses the previous output automatically.
        </p>
      </DocSection>

      <DocSection title="Archives are special">
        <p>
          Extracting an archive produces files whose names ReFile can&apos;t
          know in advance. For reliable results, tell it what you expect
          (“extract this zip, it contains PDFs”) or extract first and then
          act on a specific file.
        </p>
      </DocSection>

      <DocSection title="It will refuse off-topic asks">
        <p>
          ReFile is purpose-built for files. Ask it to write code, answer
          trivia, or do general tasks and it will politely decline and steer
          you back to file work. That&apos;s intentional — it keeps the
          product fast, predictable, and safe.
        </p>
      </DocSection>

      <DocCallout tone="warn">
        When ReFile isn&apos;t sure it can do something correctly, it says
        so instead of producing a broken result. A clear &ldquo;I
        can&apos;t do that&rdquo; is by design — and a refused or failed
        attempt never counts toward your usage.
      </DocCallout>
    </>
  );
}
