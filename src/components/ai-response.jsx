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
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getDisplayNames(file) {
  if (typeof file === "string") return { stored: file, original: file };
  if (!file || typeof file !== "object") return { stored: "file", original: "file" };
  const stored =
    file.stored_filename ||
    file.storedFilename ||
    file.storedName ||
    file.filename ||
    file.name;
  const original =
    file.original_filename ||
    file.originalFilename ||
    file.filename ||
    file.name ||
    stored;
  return { stored: stored || original || "file", original: original || stored || "file" };
}

export function AIResponse({ result, status = "completed" }) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState({});

  if (!result) return null;

  const ai = result.ai_response || result;
  const isProcessing = status === "processing";
  const isFailed = status === "failed";

  if (!ai || (!ai.linux_command && !ai.description && !isProcessing && !isFailed)) {
    return (
      <div className="surface flex items-center gap-3 p-4">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
        <p className="text-[13px] text-muted-foreground">Preparing response…</p>
      </div>
    );
  }

  const { linux_command, input_files, output_files, description, command_template } = ai;

  const copyCommand = async () => {
    if (!linux_command) return;
    try {
      await navigator.clipboard.writeText(linux_command);
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
    if (!command_template) {
      toast.error("This response has no reusable template");
      return;
    }
    sessionStorage.setItem(
      "preset_draft",
      JSON.stringify({
        command_template,
        description: description || "",
        input_files: input_files || [],
        output_files: output_files || [],
      })
    );
    router.push("/presets/create");
  };

  const handleDownload = async (file) => {
    const { stored, original } = getDisplayNames(file);
    const userId = user?.id || localStorage.getItem("user_id");
    if (!userId) {
      toast.error("Sign in to download files");
      return;
    }
    const url = `${API_BASE}/files/${encodeURIComponent(userId)}/${encodeURIComponent(stored)}`;

    try {
      setDownloading((d) => ({ ...d, [stored]: true }));
      const res = await fetch(url, { headers: { "x-user-id": userId } });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = original;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      toast.error("Download failed", { description: err?.message });
    } finally {
      setDownloading((d) => ({ ...d, [stored]: false }));
    }
  };

  return (
    <div className="space-y-3">
      {/* Status strip */}
      <div className="flex items-center gap-2 text-[12px]">
        {isProcessing ? (
          <>
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Processing…</span>
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

      {/* Description */}
      {description && (
        <div className="surface p-4">
          <div className="mb-1.5 flex items-center gap-2 text-[12px] text-muted-foreground">
            <Sparkles className="size-3.5" />
            <span>What this does</span>
          </div>
          <p className="text-[13.5px] leading-relaxed text-foreground">{description}</p>
        </div>
      )}

      {/* Command */}
      {linux_command && (
        <div className="surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <Terminal className="size-3.5" />
              <span>Command</span>
            </div>
            <div className="flex items-center gap-1.5">
              {command_template && (
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
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
          <pre className="code-block rounded-none border-0 bg-transparent">{linux_command}</pre>
        </div>
      )}

      {/* I/O */}
      {(input_files?.length > 0 || output_files?.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {input_files?.length > 0 && (
            <div className="surface p-4">
              <div className="mb-2.5 flex items-center gap-2 text-[12px] text-muted-foreground">
                <FileInput className="size-3.5" />
                <span>Inputs ({input_files.length})</span>
              </div>
              <ul className="space-y-1.5">
                {input_files.map((file, i) => {
                  const { original } = getDisplayNames(file);
                  return (
                    <li
                      key={i}
                      className="truncate rounded-md bg-muted/50 px-2.5 py-1.5 text-mono text-[12px]"
                      title={original}
                    >
                      {original}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {output_files?.length > 0 && (
            <div className="surface p-4">
              <div className="mb-2.5 flex items-center gap-2 text-[12px] text-muted-foreground">
                <FileDown className="size-3.5" />
                <span>Outputs ({output_files.length})</span>
              </div>
              <ul className="space-y-1.5">
                {output_files.map((file, i) => {
                  const { stored, original } = getDisplayNames(file);
                  const isDown = Boolean(downloading[stored]);
                  return (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-2.5 py-1.5"
                    >
                      <span className="truncate text-mono text-[12px]" title={original}>
                        {original}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownload(file)}
                        disabled={isDown}
                      >
                        {isDown ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Download className="size-3.5" />
                        )}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
