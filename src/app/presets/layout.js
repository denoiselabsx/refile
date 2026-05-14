import { absoluteUrl } from "@/lib/site";

export const metadata = {
  title: "Presets",
  description:
    "Reusable shell-command recipes for converting, extracting, and transforming files — ffmpeg, ImageMagick, Ghostscript, qpdf, and more. Contributed by the ReFile community.",
  keywords: [
    "ffmpeg presets",
    "imagemagick presets",
    "pdf compression preset",
    "shell command library",
    "file conversion recipes",
  ],
  alternates: { canonical: absoluteUrl("/presets") },
  openGraph: {
    title: "Presets — ReFile",
    description:
      "Reusable shell-command recipes for files — image, video, audio, PDF, and more.",
    url: absoluteUrl("/presets"),
  },
};

export default function PresetsSegmentLayout({ children }) {
  return children;
}
