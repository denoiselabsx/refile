import { notFound } from "next/navigation";
import { HIDE_LAUNCH_FEATURES } from "@/lib/nav";

export const metadata = {
  title: "Workflows",
  description:
    "Chain presets together on a visual canvas to build deterministic, repeatable file pipelines.",
};

export default function WorkflowSegmentLayout({ children }) {
  if (HIDE_LAUNCH_FEATURES) notFound();
  return children;
}
