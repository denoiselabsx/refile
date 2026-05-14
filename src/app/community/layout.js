import { absoluteUrl } from "@/lib/site";

export const metadata = {
  title: "Community",
  description:
    "ReFile is built by people who use it. Top community presets, GitHub, email, office hours, and house rules.",
  alternates: { canonical: absoluteUrl("/community") },
  openGraph: {
    title: "Community — ReFile",
    description:
      "Top community presets, GitHub, email, and how to contribute.",
    url: absoluteUrl("/community"),
  },
};

export default function CommunitySegmentLayout({ children }) {
  return children;
}
