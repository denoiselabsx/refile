"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery } from "convex/react";
import {
  Plus,
  History,
  Sparkles,
  MessageSquare,
  Trash2,
  Menu,
  X,
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
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";

/**
 * ChatShell — shared layout for the dashboard chat experience.
 * Renders the sidebar list of chats, a header, the turn list, and a composer.
 *
 * Pass `chatId={null}` for the "new chat" landing (empty composer).
 * Pass `chatId="..."` to render an existing chat's turns and continue it.
 */
export function ChatShell({ chatId = null }) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [isBusy, setIsBusy] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const scrollRef = useRef(null);

  const chats = useQuery(
    api.chats.listMine,
    isAuthenticated ? { limit: 50 } : "skip"
  );
  const chatData = useQuery(
    api.chats.get,
    isAuthenticated && chatId ? { id: chatId } : "skip"
  );
  const generateUploadUrl = useMutation(api.prompts.generateUploadUrl);
  const submit = useMutation(api.prompts.submit);
  const removeChat = useMutation(api.chats.remove);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/");
  }, [isAuthenticated, isLoading, router]);

  // Auto-scroll to bottom when a new turn arrives.
  useEffect(() => {
    if (scrollRef.current && chatData?.turns?.length) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [chatData?.turns?.length]);

  const handleSubmit = async (files, prompt) => {
    if (!isAuthenticated) {
      toast.error("Sign in to continue");
      return;
    }
    setIsBusy(true);
    try {
      const inputStorageIds = [];
      const inputFilenames = [];
      for (const file of files) {
        const uploadUrl = await generateUploadUrl();
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
          body: file,
        });
        if (!res.ok) throw new Error(`Upload failed (${res.status})`);
        const { storageId } = await res.json();
        inputStorageIds.push(storageId);
        inputFilenames.push(file.name);
      }

      const result = await submit({
        prompt,
        inputStorageIds,
        inputFilenames,
        chatId: chatId ?? undefined,
      });

      // If we just created a chat, navigate to it.
      if (!chatId && result?.chatId) {
        router.push(`/dashboard/${result.chatId}`);
      }
    } catch (err) {
      toast.error("Couldn't process", { description: err?.message });
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeleteChat = async (id, e) => {
    e?.stopPropagation?.();
    if (!confirm("Delete this chat and all its turns?")) return;
    try {
      await removeChat({ id });
      if (chatId === id) router.push("/dashboard");
    } catch (err) {
      toast.error("Couldn't delete", { description: err?.message });
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <AppShell mode="app">
        <div className="flex h-full items-center justify-center">
          <Skeleton className="size-8 rounded-full" />
        </div>
      </AppShell>
    );
  }

  const firstName = user?.name?.split(" ")[0] || "there";
  const turns = chatData?.turns ?? [];
  const chat = chatData?.chat ?? null;

  const historyPanel = (
    <>
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <span className="flex items-center gap-2 text-[12px] font-medium text-muted-foreground">
          <History className="size-3.5" />
          History
        </span>
        <div className="flex items-center gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            asChild
            aria-label="New chat"
            onClick={() => setHistoryOpen(false)}
          >
            <Link href="/dashboard">
              <Plus className="size-3.5" />
            </Link>
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => setHistoryOpen(false)}
            aria-label="Close history"
            className="lg:hidden"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-3">
        {chats === undefined ? (
          <div className="space-y-2 px-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : chats.length === 0 ? (
          <div className="px-3 py-8 text-center text-[12px] text-muted-foreground">
            No conversations yet
          </div>
        ) : (
          <ul className="space-y-0.5">
            {chats.map((c) => {
              const active = c._id === chatId;
              return (
                <li key={c._id}>
                  <div
                    className={cn(
                      "group flex items-start rounded-md transition-colors",
                      active ? "bg-muted" : "hover:bg-muted/60"
                    )}
                  >
                    <Link
                      href={`/dashboard/${c._id}`}
                      onClick={() => setHistoryOpen(false)}
                      className="min-w-0 flex-1 px-2.5 py-2 text-left"
                    >
                      <p className="line-clamp-1 text-[12.5px] font-medium text-foreground">
                        {c.title || "Untitled chat"}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                        {new Date(c.lastActivity).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric" }
                        )}
                      </p>
                    </Link>
                    <button
                      onClick={(e) => handleDeleteChat(c._id, e)}
                      className="mr-1 mt-1 inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                      aria-label="Delete chat"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );

  const inExistingChat = Boolean(chatId);

  return (
    <AppShell mode="app">
      <div className="grid h-full min-h-0 grid-cols-1 grid-rows-1 lg:grid-cols-[260px_1fr]">
        {/* Desktop history sidebar */}
        <aside className="hidden h-full min-h-0 flex-col border-r border-border lg:flex">
          {historyPanel}
        </aside>

        {/* Mobile history drawer */}
        <AnimatePresence>
          {historyOpen && (
            <>
              <motion.div
                key="history-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm lg:hidden"
                onClick={() => setHistoryOpen(false)}
              />
              <motion.aside
                key="history-drawer"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="fixed inset-y-0 left-14 z-50 flex w-[min(80vw,300px)] flex-col border-r border-border bg-background lg:hidden"
              >
                {historyPanel}
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <div className="flex h-full min-h-0 flex-col">
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-border glass px-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-2.5">
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => setHistoryOpen(true)}
                aria-label="Open history"
                className="lg:hidden"
              >
                <Menu className="size-4" />
              </Button>
              <MessageSquare className="hidden size-4 text-muted-foreground sm:block" />
              <h1 className="truncate text-[13px] font-medium tracking-tight sm:text-[14px]">
                {chat
                  ? chat.title
                  : chatId
                    ? "Loading…"
                    : "New chat"}
              </h1>
            </div>
            {chat && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => handleDeleteChat(chat._id, e)}
              >
                <Trash2 className="size-3.5" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            )}
          </header>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto overscroll-contain"
          >
            <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-5 sm:py-8">
              {!inExistingChat ? (
                <WelcomeState firstName={firstName} />
              ) : chatData === undefined ? (
                <div className="space-y-6">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : chatData === null ? (
                <EmptyState
                  title="Chat not found"
                  description="It may have been deleted, or doesn't exist."
                />
              ) : (
                <div className="space-y-8 sm:space-y-10">
                  <AnimatePresence initial={false}>
                    {turns.map((t) => (
                      <Turn key={t._id} turn={t} />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 border-t border-border bg-background/85 backdrop-blur">
            <div className="mx-auto w-full max-w-3xl px-4 pb-4 pt-3 sm:px-5 sm:pb-6 sm:pt-4">
              <Composer
                onSubmit={handleSubmit}
                isBusy={isBusy}
                autoFocus
                allowEmptyFiles
                placeholder={
                  inExistingChat && turns.length > 0
                    ? "Follow up — ask anything, or describe a file operation…"
                    : "Ask anything, or drop files and describe what to do…"
                }
              />
              <p className="mt-2 hidden text-center text-[11px] text-muted-foreground sm:block">
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
      className="mt-4 sm:mt-10"
    >
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-card">
          <Sparkles className="size-4" />
        </div>
        <div>
          <h2 className="text-[17px] font-semibold tracking-tight sm:text-[20px]">
            Hi {firstName} — what are we converting?
          </h2>
          <p className="mt-1 text-[12.5px] text-muted-foreground sm:text-[13.5px]">
            Drop files anywhere on this page, then describe the outcome.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-2 sm:mt-8 sm:grid-cols-2">
        {[
          "Extract audio from this video as 192kbps MP3",
          "Resize these images to 1080p, save as WebP",
          "Merge these PDFs and compress under 2 MB",
          "Convert this MP4 to a 1080p H.264 video",
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
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-medium text-muted-foreground">
          You
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] leading-relaxed text-foreground">
            {turn.prompt}
          </p>
          {turn.inputFilenames?.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {turn.inputFilenames.map((n, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-md border border-border bg-muted/50 px-2 py-0.5 text-mono text-[11px] text-muted-foreground"
                >
                  {n}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <Separator className="opacity-50" />

      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-foreground text-background">
          <Sparkles className="size-3" />
        </div>
        <div className="flex-1 min-w-0">
          <AIResponse prompt={turn} />
        </div>
      </div>
    </motion.div>
  );
}
