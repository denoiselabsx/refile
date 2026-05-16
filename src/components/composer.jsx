"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Composer({
  onSubmit,
  onOpenUploads,
  isBusy = false,
  placeholder = "Describe what to do with your files…",
  autoFocus = false,
  fileMentions = [],
  // Optional initial prompt text (e.g. "Use preset" → preset name + description).
  initialPrompt = "",
}) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [activeMention, setActiveMention] = useState(null);
  const [mentionIndex, setMentionIndex] = useState(0);

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

  const mentionOptions = useMemo(() => {
    if (!activeMention) return [];
    const q = activeMention.query.toLowerCase();
    return fileMentions
      .filter((name) => name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [activeMention, fileMentions]);

  useEffect(() => {
    setMentionIndex(0);
  }, [activeMention?.query]);

  const canSend =
    !isBusy &&
    prompt.trim().length > 0;

  const updateMentionState = (nextPrompt) => {
    const mentionMatch = nextPrompt.match(/(^|\s)@(?:"([^"]*)"|([^\s@"]*))$/);
    if (!mentionMatch) {
      setActiveMention(null);
      return;
    }
    const query = mentionMatch[2] ?? mentionMatch[3] ?? "";
    const mentionAt = nextPrompt.lastIndexOf("@");
    const start = nextPrompt.length - query.length;
    setActiveMention({ query, start, mentionAt });
  };

  const applyMention = (filename) => {
    if (!activeMention) return;
    const before = prompt.slice(0, activeMention.mentionAt);
    const after = prompt.slice(activeMention.start + activeMention.query.length);
    const encoded = filename.includes(" ") ? `@"${filename}"` : `@${filename}`;
    const next = `${before}${encoded}${after}`;
    setPrompt(next);
    setActiveMention(null);
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      const cursor = before.length + encoded.length;
      ta.focus();
      ta.setSelectionRange(cursor, cursor);
    });
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!canSend) {
      if (!prompt.trim()) toast.error("Tell us what to do");
      return;
    }
    await onSubmit(prompt.trim());
    setPrompt("");
    setActiveMention(null);
  };

  const onKeyDown = (e) => {
    if (mentionOptions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((idx) => Math.min(idx + 1, mentionOptions.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((idx) => Math.max(idx - 1, 0));
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        applyMention(mentionOptions[mentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        setActiveMention(null);
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "relative w-full rounded-2xl border border-border bg-card/80 shadow-sm backdrop-blur",
        "transition-all duration-150"
      )}
    >
      <AnimatePresence>
        {mentionOptions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute -top-2 left-2 right-2 z-10 -translate-y-full overflow-hidden rounded-xl border border-border bg-card shadow-lg"
          >
            <ul className="max-h-52 overflow-auto py-1">
              {mentionOptions.map((name, idx) => (
                <li key={name}>
                  <button
                    type="button"
                    onClick={() => applyMention(name)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px]",
                      idx === mentionIndex ? "bg-muted" : "hover:bg-muted/60"
                    )}
                  >
                    <span className="text-muted-foreground">@</span>
                    <span className="truncate text-mono">{name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Textarea */}
      <div className="px-3.5 pt-3 sm:px-4 sm:pt-3.5">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => {
            const next = e.target.value;
            setPrompt(next);
            updateMentionState(next);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={isBusy}
          rows={1}
          className={cn(
            "composer-input block w-full resize-none bg-transparent text-[15px] leading-[1.5] text-foreground placeholder:text-muted-foreground sm:text-[14.5px]",
            "focus:outline-none disabled:opacity-60"
          )}
          style={{ minHeight: "24px" }}
        />
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Type @ to mention uploaded files
        </p>
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-1.5 sm:px-2.5 sm:pb-2.5 sm:pt-2">
        <div>
          {onOpenUploads && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onOpenUploads}
              aria-label="Attach files"
              title="Attach files"
            >
              <Paperclip className="size-[18px]" />
            </Button>
          )}
        </div>
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
    </form>
  );
}
