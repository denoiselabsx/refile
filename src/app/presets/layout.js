import { notFound } from "next/navigation";
import { absoluteUrl } from "@/lib/site";
import { HIDE_LAUNCH_FEATURES } from "@/lib/nav";

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
  if (HIDE_LAUNCH_FEATURES) notFound();
  return children;
}
