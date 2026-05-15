"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Paperclip,
  ArrowUp,
  X,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  File as FileIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function pickIcon(file) {
  const t = file.type || "";
  if (t.startsWith("image/")) return ImageIcon;
  if (t.startsWith("video/")) return Video;
  if (t.startsWith("audio/")) return Music;
  if (t.includes("pdf") || t.includes("document") || t.includes("text"))
    return FileText;
  return FileIcon;
}

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function Composer({
  onSubmit,
  isBusy = false,
  placeholder = "Describe what to do with your files…",
  autoFocus = false,
  // When true, file attachment is optional (e.g. follow-up in an existing chat
  // can reuse the previous turn's outputs).
  allowEmptyFiles = false,
  // Optional initial prompt text (e.g. "Use preset" → preset name + description).
  initialPrompt = "",
}) {
  const [files, setFiles] = useState([]);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "0";
    ta.style.height = Math.min(ta.scrollHeight, 240) + "px";
  }, [prompt]);

  useEffect(() => {
    if (autoFocus && textareaRef.current) textareaRef.current.focus();
  }, [autoFocus]);

  // Page-level drag-and-drop
  useEffect(() => {
    const onDragOver = (e) => {
      if (!e.dataTransfer?.types?.includes("Files")) return;
      e.preventDefault();
      setIsDragging(true);
    };
    const onDragLeave = (e) => {
      if (e.relatedTarget === null) setIsDragging(false);
    };
    const onDrop = (e) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = Array.from(e.dataTransfer.files || []);
      if (dropped.length) addFiles(dropped);
    };
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  const addFiles = (incoming) => {
    setFiles((prev) => [...prev, ...incoming]);
  };

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length) addFiles(selected);
    e.target.value = "";
  };

  const canSend =
    !isBusy &&
    prompt.trim().length > 0 &&
    (allowEmptyFiles || files.length > 0);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!canSend) {
      if (!prompt.trim()) toast.error("Tell us what to do");
      else if (!allowEmptyFiles && files.length === 0)
        toast.error("Add at least one file");
      return;
    }
    await onSubmit(files, prompt.trim());
    setFiles([]);
    setPrompt("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <TooltipProvider>
      <form
        onSubmit={handleSubmit}
        className={cn(
          "relative w-full rounded-2xl border border-border bg-card/80 shadow-sm backdrop-blur",
          "transition-all duration-150",
          "focus-within:border-border-strong focus-within:shadow-md",
          isDragging && "ring-2 ring-foreground/30 ring-offset-2 ring-offset-background"
        )}
      >
        {/* Drag overlay */}
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-background/85 backdrop-blur"
            >
              <div className="flex flex-col items-center gap-2 text-foreground">
                <Paperclip className="size-5" />
                <span className="text-[13px] font-medium">Drop to attach</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* File chips */}
        <AnimatePresence initial={false}>
          {files.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-border"
            >
              <div className="flex flex-wrap gap-2 p-2.5 sm:p-3">
                {files.map((file, i) => {
                  const Icon = pickIcon(file);
                  return (
                    <motion.div
                      layout
                      key={`${file.name}-${i}`}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.16 }}
                      className="group inline-flex max-w-[220px] items-center gap-1.5 rounded-md border border-border bg-muted/60 px-2 py-1 text-[11.5px] sm:max-w-[260px] sm:gap-2 sm:px-2.5 sm:py-1.5 sm:text-[12px]"
                    >
                      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate font-medium" title={file.name}>
                        {file.name}
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {fmtSize(file.size)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="ml-0.5 inline-flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="size-3.5" />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Textarea */}
        <div className="px-3.5 pt-3 sm:px-4 sm:pt-3.5">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            disabled={isBusy}
            rows={1}
            className={cn(
              "block w-full resize-none bg-transparent text-[15px] leading-[1.5] text-foreground placeholder:text-muted-foreground sm:text-[14.5px]",
              "focus:outline-none disabled:opacity-60"
            )}
            style={{ minHeight: "24px" }}
          />
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-1.5 sm:px-2.5 sm:pb-2.5 sm:pt-2">
          <div className="flex min-w-0 items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isBusy}
                  aria-label="Attach files"
                >
                  <Paperclip className="size-[18px]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Attach files</TooltipContent>
            </Tooltip>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={handleFileSelect}
            />

          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden text-[11px] text-muted-foreground md:inline">
              {files.length === 0
                ? "Drop files anywhere"
                : `${files.length} file${files.length === 1 ? "" : "s"} attached`}
            </span>
            <Button
              type="submit"
              size="icon"
              disabled={!canSend}
              aria-label="Send"
              loading={isBusy}
              className="rounded-full"
            >
              {!isBusy && <ArrowUp className="size-[18px]" />}
            </Button>
          </div>
        </div>
      </form>
    </TooltipProvider>
  );
}
