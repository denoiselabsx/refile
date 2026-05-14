"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Paperclip,
  Mic,
  Square,
  ArrowUp,
  X,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  File as FileIcon,
  Globe,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { value: "auto", label: "Auto-detect" },
  { value: "en", label: "English" },
  { value: "hi", label: "हिन्दी · Hindi" },
  { value: "ta", label: "தமிழ் · Tamil" },
  { value: "te", label: "తెలుగు · Telugu" },
  { value: "kn", label: "ಕನ್ನಡ · Kannada" },
  { value: "ml", label: "മലയാളം · Malayalam" },
  { value: "mr", label: "मराठी · Marathi" },
  { value: "bn", label: "বাংলা · Bengali" },
  { value: "gu", label: "ગુજરાતી · Gujarati" },
  { value: "pa", label: "ਪੰਜਾਬੀ · Punjabi" },
  { value: "ur", label: "اردو · Urdu" },
];

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
}) {
  const [files, setFiles] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [language, setLanguage] = useState("auto");

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);

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

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data?.size) audioChunksRef.current.push(e.data);
      };
      mr.start();
      setIsRecording(true);
    } catch {
      toast.error("Microphone access denied");
    }
  }, []);

  const stopRecording = useCallback(async (cancel = false) => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;

    const finalize = () =>
      new Promise((resolve) => {
        mr.onstop = () => resolve();
        mr.stop();
      });

    await finalize();
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    setIsRecording(false);

    if (cancel || audioChunksRef.current.length === 0) {
      audioChunksRef.current = [];
      return;
    }

    const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    audioChunksRef.current = [];

    try {
      setIsTranscribing(true);
      const fd = new FormData();
      fd.append("audio", blob, "recording.webm");
      fd.append("language", language);
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Transcription failed");
      const { text } = await res.json();
      if (text) {
        setPrompt((p) => (p ? `${p} ${text}` : text));
        toast.success("Transcribed");
      }
    } catch (err) {
      toast.error("Couldn't transcribe", { description: err?.message });
    } finally {
      setIsTranscribing(false);
    }
  }, [language]);

  const canSend =
    !isBusy &&
    !isRecording &&
    !isTranscribing &&
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
          "surface relative w-full transition-all duration-150",
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
              className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/85 backdrop-blur"
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
              <div className="flex flex-wrap gap-2 p-3">
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
                      className="group inline-flex max-w-[260px] items-center gap-2 rounded-md border border-border bg-muted/60 px-2.5 py-1.5 text-[12px]"
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
                        className="ml-0.5 text-muted-foreground transition-colors hover:text-destructive"
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
        <div className="px-4 pt-3.5">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            disabled={isBusy || isTranscribing}
            rows={1}
            className={cn(
              "block w-full resize-none bg-transparent text-[14px] leading-relaxed text-foreground placeholder:text-muted-foreground",
              "focus:outline-none disabled:opacity-60"
            )}
            style={{ minHeight: "24px" }}
          />
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between gap-2 px-3 py-2.5">
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isBusy}
                  aria-label="Attach files"
                >
                  <Paperclip className="size-4" />
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

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant={isRecording ? "destructive" : "ghost"}
                  size="icon-sm"
                  onClick={() => (isRecording ? stopRecording(false) : startRecording())}
                  disabled={isBusy || isTranscribing}
                  aria-label={isRecording ? "Stop recording" : "Record"}
                  className={cn(isRecording && "animate-pulse-soft")}
                >
                  {isRecording ? <Square className="size-4 fill-current" /> : <Mic className="size-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isRecording ? "Stop & transcribe" : "Voice input"}
              </TooltipContent>
            </Tooltip>

            {isRecording && (
              <button
                type="button"
                onClick={() => stopRecording(true)}
                className="text-[11.5px] text-muted-foreground transition-colors hover:text-foreground"
              >
                Cancel
              </button>
            )}

            {(isRecording || isTranscribing) && (
              <Select value={language} onValueChange={setLanguage} disabled={isRecording}>
                <SelectTrigger className="h-7 w-auto gap-1.5 border-0 bg-transparent px-2 text-[11.5px] text-muted-foreground hover:bg-muted">
                  <Globe className="size-3" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {isTranscribing && (
              <span className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                Transcribing…
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isRecording && !isTranscribing && (
              <span className="hidden text-[11px] text-muted-foreground sm:inline">
                {files.length === 0
                  ? "Drop files anywhere"
                  : `${files.length} file${files.length === 1 ? "" : "s"} attached`}
              </span>
            )}
            <Button
              type="submit"
              size="icon"
              disabled={!canSend}
              aria-label="Send"
              loading={isBusy}
            >
              {!isBusy && <ArrowUp className="size-4" />}
            </Button>
          </div>
        </div>
      </form>
    </TooltipProvider>
  );
}
