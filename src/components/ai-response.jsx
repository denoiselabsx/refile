"use client";

import { useRouter } from "next/navigation";
import {
  Check,
  Download,
  FileDown,
  AlertTriangle,
  Save,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { HIDE_LAUNCH_FEATURES } from "@/lib/nav";

export function AIResponse({ prompt }) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  if (!prompt) return null;

  const isPending =
    prompt.status === "pending" || prompt.status === "generating";
  const isRunning = prompt.status === "running";
  const isFailed = prompt.status === "failed";

  const handleSaveAsPreset = () => {
    if (!isAuthenticated) {
      toast.error("Sign in to save presets");
      return;
    }
    if (!prompt.aiCommandTemplate) {
      toast.error("This response has no reusable template");
      return;
    }
    sessionStorage.setItem(
      "preset_draft",
      JSON.stringify({
        command_template: prompt.aiCommandTemplate,
        description: prompt.aiDescription || "",
        input_files: prompt.aiInputFiles || [],
        output_files: prompt.aiOutputFiles || [],
        tool: prompt.aiTool || "",
      })
    );
    router.push("/presets/create");
  };

  return (
    <div className="space-y-3">
      {/* ── In-progress: a single calm status line ── */}
      {(isPending || isRunning) && (
        <div className="surface flex items-center gap-3 px-4 py-3.5">
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-[13.5px] font-medium text-foreground">
              {isRunning ? "Working on it…" : "Understanding your request…"}
            </p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {isRunning
                ? "Processing your files securely. This usually takes a few seconds."
                : "Figuring out the best way to do this."}
            </p>
          </div>
        </div>
      )}

      {/* ── Chat reply (no file op) ── */}
      {!isPending && !isRunning && prompt.aiKind === "chat" && prompt.aiMessage && (
        <div className="whitespace-pre-wrap text-[14px] leading-relaxed text-foreground">
          {prompt.aiMessage}
        </div>
      )}

      {/* ── Success: ONE cohesive result card. Summary header +
           outputs as the hero (the file is what they came for). ── */}
      {!isPending &&
        !isRunning &&
        !isFailed &&
        prompt.aiKind !== "chat" &&
        (prompt.outputUrls?.length > 0 ||
          prompt.aiDescription ||
          prompt.aiCommand) && (
          <div className="surface overflow-hidden">
            <div className="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-3.5">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[13.5px] font-medium leading-snug text-foreground">
                  <Check className="size-3.5 shrink-0 text-success" />
                  {prompt.aiDescription || "Done — your files are ready"}
                </p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {prompt.outputUrls?.length
                    ? `${prompt.outputUrls.length} file${
                        prompt.outputUrls.length === 1 ? "" : "s"
                      } ready to download`
                    : "Completed"}
                </p>
              </div>
              {!HIDE_LAUNCH_FEATURES && prompt.aiCommandTemplate && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSaveAsPreset}
                  disabled={!isAuthenticated}
                  className="shrink-0"
                >
                  <Save className="size-3.5" /> Save preset
                </Button>
              )}
            </div>

            {prompt.outputUrls?.length > 0 && (
              <ul className="divide-y divide-border/60">
                {prompt.outputUrls.map((out) => (
                  <li
                    key={out.storageId}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <FileDown className="size-4 shrink-0 text-muted-foreground" />
                      <span
                        className="truncate text-[13px] font-medium text-foreground"
                        title={out.filename}
                      >
                        {out.filename}
                      </span>
                    </div>
                    {out.url && (
                      <a
                        href={out.url}
                        download={out.filename}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-[12.5px] font-medium text-background transition-opacity hover:opacity-90"
                      >
                        <Download className="size-3.5" />
                        Download
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {prompt.filesExpired &&
              !prompt.outputUrls?.length &&
              prompt.status === "completed" && (
                <p className="px-4 py-3 text-[12px] text-muted-foreground">
                  Files expired — outputs are deleted after 24 hours. Re-upload
                  to run this again.
                </p>
              )}
          </div>
        )}

      {/* ── Failure: friendly, no logs/command leaked ── */}
      {isFailed && (
        <div className="surface px-4 py-3.5 text-[13px] leading-relaxed text-muted-foreground">
          <p className="flex items-center gap-1.5 font-medium text-foreground">
            <AlertTriangle className="size-3.5 shrink-0 text-destructive" />
            That one didn&apos;t work out
          </p>
          <p className="mt-1">
            ReFile couldn&apos;t complete this one. Try rephrasing what you
            want, or adjust the files and run it again — this attempt
            wasn&apos;t counted toward your usage.
          </p>
        </div>
      )}
    </div>
  );
}
