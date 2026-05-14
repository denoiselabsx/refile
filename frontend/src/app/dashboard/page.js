"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  History,
  Sparkles,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/shell/app-shell";
import { Composer } from "@/components/composer";
import { AIResponse } from "@/components/ai-response";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/auth-context";
import { uploadFiles, listPrompts } from "@/services/api";

const STATUS = { COMPLETED: "completed", PENDING: "pending", FAILED: "failed" };

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [thread, setThread] = useState([]); // { id, prompt, response, status }
  const [history, setHistory] = useState([]);
  const [isBusy, setIsBusy] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/");
  }, [isAuthenticated, isLoading, router]);

  // Load history
  const loadHistory = useCallback(async (uid) => {
    setHistoryLoading(true);
    try {
      const res = await listPrompts(uid);
      if (res?.status === "ok" && res.items) {
        setHistory(res.items.slice(0, 25));
      }
    } catch (err) {
      // history is non-critical
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem("user_id", user.id);
      loadHistory(user.id);
    }
  }, [user?.id, loadHistory]);

  const handleSubmit = async (files, prompt) => {
    if (!user?.id) {
      toast.error("Not signed in");
      return;
    }
    const turnId = crypto.randomUUID();
    setThread((t) => [
      ...t,
      { id: turnId, prompt, files, response: null, status: "pending" },
    ]);
    setIsBusy(true);

    try {
      const result = await uploadFiles(files, prompt, user.id);
      setThread((t) =>
        t.map((turn) =>
          turn.id === turnId
            ? { ...turn, response: result, status: result.status === "ok" ? STATUS.COMPLETED : STATUS.FAILED }
            : turn
        )
      );
      loadHistory(user.id);
    } catch (err) {
      setThread((t) =>
        t.map((turn) =>
          turn.id === turnId ? { ...turn, status: STATUS.FAILED, errorMessage: err.message } : turn
        )
      );
      toast.error("Couldn't process", { description: err.message });
    } finally {
      setIsBusy(false);
    }
  };

  const handleNewChat = () => setThread([]);

  const handleHistoryClick = (item) => {
    setThread([
      {
        id: item.id,
        prompt: item.prompt,
        files: [
          {
            original_filename: item.original_filename,
            stored_filename: item.stored_filename,
          },
        ],
        response: {
          ai_response: {
            linux_command: item.ai_command,
            command_template: item.command_template || item.ai_command,
            description: item.ai_response || "Previous conversation",
            input_files: [],
            output_files: [],
          },
        },
        status: item.ai_processing_status || STATUS.COMPLETED,
      },
    ]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (isLoading || !isAuthenticated) {
    return (
      <AppShell mode="app">
        <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
          <Skeleton className="size-8 rounded-full" />
        </div>
      </AppShell>
    );
  }

  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <AppShell mode="app">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_1fr]">
        {/* History rail */}
        <aside className="hidden border-r border-border lg:flex lg:flex-col">
          <div className="flex h-14 items-center justify-between border-b border-border px-4">
            <span className="flex items-center gap-2 text-[12px] font-medium text-muted-foreground">
              <History className="size-3.5" />
              History
            </span>
            <Button size="icon-sm" variant="ghost" onClick={handleNewChat} aria-label="New chat">
              <Plus className="size-3.5" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-3">
            {historyLoading ? (
              <div className="space-y-2 px-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="px-3 py-8 text-center text-[12px] text-muted-foreground">
                No conversations yet
              </div>
            ) : (
              <ul className="space-y-0.5">
                {history.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => handleHistoryClick(item)}
                      className="group w-full rounded-md px-2.5 py-2 text-left transition-colors hover:bg-muted"
                    >
                      <p className="line-clamp-1 text-[12.5px] font-medium text-foreground">
                        {item.prompt}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                        {item.original_filename} ·{" "}
                        {new Date(item.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Main canvas */}
        <div className="flex min-h-screen flex-col">
          {/* Thread header */}
          <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border glass px-5">
            <div className="flex items-center gap-2.5">
              <MessageSquare className="size-4 text-muted-foreground" />
              <h1 className="text-[14px] font-medium tracking-tight">
                {thread.length === 0 ? "New chat" : `Chat · ${thread.length} ${thread.length === 1 ? "turn" : "turns"}`}
              </h1>
            </div>
            {thread.length > 0 && (
              <Button size="sm" variant="ghost" onClick={handleNewChat}>
                <Trash2 className="size-3.5" />
                Clear
              </Button>
            )}
          </header>

          {/* Thread body */}
          <div className="mx-auto w-full max-w-3xl flex-1 px-5 py-8">
            {thread.length === 0 ? (
              <WelcomeState firstName={firstName} />
            ) : (
              <div className="space-y-10">
                <AnimatePresence initial={false}>
                  {thread.map((turn) => (
                    <Turn key={turn.id} turn={turn} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Composer dock */}
          <div className="sticky bottom-0 border-t border-border bg-background/85 backdrop-blur">
            <div className="mx-auto w-full max-w-3xl px-5 pb-6 pt-4">
              <Composer onSubmit={handleSubmit} isBusy={isBusy} autoFocus />
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                ReFile picks the right tool · always returns the command it ran
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function WelcomeState({ firstName }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="mt-10"
    >
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-card">
          <Sparkles className="size-4" />
        </div>
        <div>
          <h2 className="text-[20px] font-semibold tracking-tight">
            Hi {firstName} — what are we converting?
          </h2>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            Drop files anywhere on this page, then describe the outcome.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-2 sm:grid-cols-2">
        {[
          "Extract audio from this video as 192kbps MP3",
          "Resize these images to 1080p, save as WebP",
          "Merge these PDFs and compress under 2 MB",
          "Transcribe this audio to a text file",
        ].map((s) => (
          <div
            key={s}
            className="surface px-4 py-3 text-[13px] leading-relaxed text-muted-foreground"
          >
            “{s}”
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function Turn({ turn }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-4"
    >
      {/* User message */}
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-medium text-muted-foreground">
          You
        </div>
        <div className="flex-1">
          <p className="text-[14px] leading-relaxed text-foreground">{turn.prompt}</p>
          {turn.files?.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {turn.files.map((f, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-md border border-border bg-muted/50 px-2 py-0.5 text-mono text-[11px] text-muted-foreground"
                >
                  {f.name || f.original_filename || f.stored_filename || "file"}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <Separator className="opacity-50" />

      {/* AI response */}
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-foreground text-background">
          <Sparkles className="size-3" />
        </div>
        <div className="flex-1">
          {turn.status === "pending" && !turn.response ? (
            <div className="space-y-2">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-2/4" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : turn.status === "failed" ? (
            <EmptyState
              title="Couldn't process this"
              description={turn.errorMessage || "The AI service returned an error."}
            />
          ) : (
            <AIResponse result={turn.response} status={turn.status} />
          )}
        </div>
      </div>
    </motion.div>
  );
}
