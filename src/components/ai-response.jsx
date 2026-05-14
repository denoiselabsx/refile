"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Download,
  Terminal,
  FileDown,
  FileInput,
  Sparkles,
  AlertTriangle,
  Save,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";

export function AIResponse({ prompt }) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [copied, setCopied] = useState(false);

  if (!prompt) return null;

  const isPending =
    prompt.status === "pending" || prompt.status === "generating";
  const isRunning = prompt.status === "running";
  const isFailed = prompt.status === "failed";

  const copyCommand = async () => {
    if (!prompt.aiCommand) return;
    try {
      await navigator.clipboard.writeText(prompt.aiCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn't copy");
    }
  };

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
      <div className="flex items-center gap-2 text-[12px]">
        {isPending ? (
          <>
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">
              {prompt.status === "generating"
                ? "Generating command…"
                : "Queued…"}
            </span>
          </>
        ) : isRunning ? (
          <>
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Running in sandbox…</span>
          </>
        ) : isFailed ? (
          <>
            <AlertTriangle className="size-3.5 text-destructive" />
            <span className="text-destructive">Processing failed</span>
          </>
        ) : (
          <>
            <span className="inline-flex size-1.5 rounded-full bg-success" />
            <span className="text-muted-foreground">Ready</span>
          </>
        )}
      </div>

      {isFailed && prompt.errorMessage && (
        <div className="surface border-destructive/40 bg-destructive/5 p-4 text-[13px] text-destructive">
          {prompt.errorMessage}
        </div>
      )}

      {prompt.aiDescription && (
        <div className="surface p-4">
          <div className="mb-1.5 flex items-center gap-2 text-[12px] text-muted-foreground">
            <Sparkles className="size-3.5" />
            <span>What this does</span>
          </div>
          <p className="text-[13.5px] leading-relaxed text-foreground">
            {prompt.aiDescription}
          </p>
        </div>
      )}

      {prompt.aiCommand && (
        <div className="surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <Terminal className="size-3.5" />
              <span>Command</span>
              {prompt.aiTool && (
                <>
                  <span className="opacity-50">·</span>
                  <span className="capitalize">{prompt.aiTool}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {prompt.aiCommandTemplate && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSaveAsPreset}
                  disabled={!isAuthenticated}
                >
                  <Save className="size-3.5" /> Save as preset
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={copyCommand}>
                {copied ? (
                  <Check className="size-3.5" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
          <pre className="code-block rounded-none border-0 bg-transparent">
            {prompt.aiCommand}
          </pre>
        </div>
      )}

      {(prompt.inputFilenames?.length > 0 ||
        prompt.outputUrls?.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {prompt.inputFilenames?.length > 0 && (
            <div className="surface p-4">
              <div className="mb-2.5 flex items-center gap-2 text-[12px] text-muted-foreground">
                <FileInput className="size-3.5" />
                <span>Inputs ({prompt.inputFilenames.length})</span>
              </div>
              <ul className="space-y-1.5">
                {prompt.inputFilenames.map((n, i) => (
                  <li
                    key={i}
                    className="truncate rounded-md bg-muted/50 px-2.5 py-1.5 text-mono text-[12px]"
                    title={n}
                  >
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {prompt.outputUrls?.length > 0 && (
            <div className="surface p-4">
              <div className="mb-2.5 flex items-center gap-2 text-[12px] text-muted-foreground">
                <FileDown className="size-3.5" />
                <span>Outputs ({prompt.outputUrls.length})</span>
              </div>
              <ul className="space-y-1.5">
                {prompt.outputUrls.map((out) => (
                  <li
                    key={out.storageId}
                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-2.5 py-1.5"
                  >
                    <span
                      className="truncate text-mono text-[12px]"
                      title={out.filename}
                    >
                      {out.filename}
                    </span>
                    {out.url && (
                      <a
                        href={out.url}
                        download={out.filename}
                        className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <Download className="size-3.5" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {prompt.filesExpired &&
            !prompt.outputUrls?.length &&
            prompt.status === "completed" && (
              <div className="surface border-dashed p-3 text-[12px] text-muted-foreground">
                Files expired — uploads and outputs are deleted after 24 hours.
                Re-upload to run this again.
              </div>
            )}
        </div>
      )}

      {isFailed && prompt.sandboxLogs && (
        <details className="surface">
          <summary className="cursor-pointer px-4 py-2.5 text-[12px] text-muted-foreground">
            Sandbox logs
          </summary>
          <pre className="code-block rounded-none border-0 bg-transparent text-[11px]">
            {prompt.sandboxLogs}
          </pre>
        </details>
      )}
    </div>
  );
}
