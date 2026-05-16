import { absoluteUrl } from "@/lib/site";
import {
  DocHeader,
  DocSection,
  DocList,
  DocCallout,
} from "@/components/docs/doc-parts";

export const metadata = {
  title: "Writing good prompts — Docs",
  description:
    "How to phrase requests so ReFile gets the right result on the first try.",
  alternates: { canonical: absoluteUrl("/docs/writing-prompts") },
};

export default function Page() {
  return (
    <>
      <DocHeader
        eyebrow="What ReFile does"
        title="Writing good prompts"
        intro="ReFile reads intent well, but specifics get you the right result on the first try — and a first-try success is the only kind that doesn't make you wait."
      />

      <DocSection title="Be concrete about the result">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="surface p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Vague
            </p>
            <p className="mt-2 text-[13.5px] text-foreground/85">
              “compress this video”
            </p>
          </div>
          <div className="surface p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Specific
            </p>
            <p className="mt-2 text-[13.5px] text-foreground/85">
              “Compress this MP4 to under 8 MB at 720p, H.264, keep audio at
              96 kbps.”
            </p>
          </div>
        </div>
        <p>
          Helpful details: target size, resolution, codec, bitrate, frame
          rate, quality, output format.
        </p>
      </DocSection>

      <DocSection title="Reference files by what they are">
        <p>
          With multiple files, describe them rather than guessing
          filenames: “merge these PDFs in order”, “watermark every image
          bottom-right”. To pin one exact file, type{" "}
          <code className="text-mono">@</code> and choose it.
        </p>
      </DocSection>

      <DocSection title="You can name the tool (optional)">
        <p>
          ReFile picks the right tool automatically. But if you know what
          you want, say it — “use ffmpeg”, “compress with Ghostscript at
          screen quality”. Explicit tool hints take priority.
        </p>
      </DocSection>

      <DocSection title="Words ReFile interprets like a human">
        <DocList
          items={[
            "“black & white” / “monochrome” → grayscale (not 1-bit), unless you say “1-bit”, “fax”, or “dithered”",
            "“half the volume” / “50%” → understood correctly as a multiplier",
            "“smaller” after a conversion → it compresses the previous output",
          ]}
        />
      </DocSection>

      <DocSection title="Follow-ups chain automatically">
        <p>
          After a result, “now make it grayscale” or “to webp” reuses the
          previous output as the new input — no need to re-upload.
        </p>
      </DocSection>

      <DocCallout>
        If a request is ambiguous in a way that changes the output, ReFile
        asks one quick question instead of guessing. Answer it and it
        proceeds.
      </DocCallout>
    </>
  );
}
