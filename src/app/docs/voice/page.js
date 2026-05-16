import { absoluteUrl } from "@/lib/site";
import {
  DocHeader,
  DocSection,
  DocList,
} from "@/components/docs/doc-parts";

export const metadata = {
  title: "Voice input — Docs",
  description:
    "Speak your request instead of typing — ReFile supports 11 languages including Hindi, Tamil, Telugu and more.",
  alternates: { canonical: absoluteUrl("/docs/voice") },
};

export default function Page() {
  return (
    <>
      <DocHeader
        eyebrow="What ReFile does"
        title="Voice input"
        intro="Tap the microphone and speak your request. Transcription is free — it never counts as a conversion."
      />

      <DocSection title="Languages supported">
        <p>
          Set the language for the cleanest transcription, or leave it on
          auto-detect:
        </p>
        <p className="text-[14.5px] text-foreground/85">
          English, हिन्दी, தமிழ், తెలుగు, ಕನ್ನಡ, മലയാളം, मराठी, বাংলা,
          ગુજરાતી, ਪੰਜਾਬੀ, اردو.
        </p>
      </DocSection>

      <DocSection title="Tips for clean transcription">
        <DocList
          items={[
            "Record somewhere quiet — background noise hurts accuracy most.",
            "Speak naturally; don't over-enunciate.",
            "Spell out unusual filenames (“file foo dash one dot pdf”).",
            "You can edit the transcribed text before sending — voice is a starting point, not a contract.",
          ]}
        />
      </DocSection>

      <DocSection title="Voice is just the prompt">
        <p>
          Transcribed speech becomes the same text prompt you&apos;d type —
          everything in{" "}
          <a
            href="/docs/writing-prompts"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Writing good prompts
          </a>{" "}
          applies. Be specific out loud, same as in text.
        </p>
      </DocSection>
    </>
  );
}
