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

// Pick the best supported audio recording container. Order matters: opus
// gives the best size/quality, mp4 is Safari's only option.
function pickRecorderMime() {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return "";
  }
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4",
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported?.(c)) return c;
  }
  return "";
}

function extForMime(mime) {
  if (!mime) return "webm";
  const m = mime.split(";")[0];
  switch (m) {
    case "audio/webm":
      return "webm";
    case "audio/ogg":
      return "ogg";
    case "audio/mp4":
      return "m4a";
    case "audio/mpeg":
      return "mp3";
    case "audio/wav":
      return "wav";
    default:
      return "webm";
  }
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
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [language, setLanguage] = useState("auto");

  // Persist the user's chosen language across sessions — multilingual users
  // almost never want "auto" twice in a row.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem("refile.voiceLanguage");
      if (saved) setLanguage(saved);
    } catch {}
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("refile.voiceLanguage", language);
    } catch {}
  }, [language]);

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
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // Improve recognizability of non-English speech: leave noise
          // suppression on but disable aggressive AGC, which can mangle
          // Indic tones.
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
        },
      });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      // Pick the best codec the browser actually supports. Safari only
      // produces audio/mp4; Chrome/Firefox prefer opus-in-webm.
      const mimeType = pickRecorderMime();
      const mr = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
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

    // Use whatever the recorder actually produced — Safari ignores the
    // requested mimeType and returns audio/mp4, others return webm/opus.
    const actualType = mr.mimeType || "audio/webm";
    const blob = new Blob(audioChunksRef.current, { type: actualType });
    audioChunksRef.current = [];

    if (blob.size < 1024) {
      toast.error("Recording too short — hold to speak");
      return;
    }

    try {
      setIsTranscribing(true);
      const ext = extForMime(actualType);
      const fd = new FormData();
      fd.append("audio", blob, `recording.${ext}`);
      fd.append("language", language);
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Transcription failed (${res.status})`);
      }
      const text = (data?.text || "").trim();
      if (text) {
        setPrompt((p) => (p ? `${p} ${text}` : text));
        toast.success("Transcribed");
      } else {
        toast.message("Nothing heard", {
          description: "Try recording again — a bit closer to the mic.",
        });
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
            disabled={isBusy || isTranscribing}
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

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant={isRecording ? "destructive" : "ghost"}
                  size="icon"
                  onClick={() => (isRecording ? stopRecording(false) : startRecording())}
                  disabled={isBusy || isTranscribing}
                  aria-label={isRecording ? "Stop recording" : "Record"}
                  className={cn(isRecording && "animate-pulse-soft")}
                >
                  {isRecording ? <Square className="size-[16px] fill-current" /> : <Mic className="size-[18px]" />}
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
                className="ml-1 rounded-md px-2 py-1 text-[11.5px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Cancel
              </button>
            )}

            {/* Voice language — always visible so users can pick the language
                before recording, not just during. */}
            <Select
              value={language}
              onValueChange={setLanguage}
              disabled={isRecording || isTranscribing}
            >
              <SelectTrigger
                aria-label="Voice transcription language"
                className="h-7 w-auto gap-1 border-0 bg-transparent px-1.5 text-[11.5px] text-muted-foreground hover:bg-muted sm:gap-1.5 sm:px-2"
              >
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

            {isTranscribing && (
              <span className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                Transcribing…
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {!isRecording && !isTranscribing && (
              <span className="hidden text-[11px] text-muted-foreground md:inline">
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
