"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery } from "convex/react";
import {
  Plus,
  History,
  Sparkles,
  Trash2,
  X,
  PanelLeft,
  Moon,
  Sun,
  LogOut,
  Settings,
  Upload,
  Download,
  PanelRightClose,
  PanelLeftOpen,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { AppShell } from "@/components/shell/app-shell";
import { Composer } from "@/components/composer";
import { AIResponse } from "@/components/ai-response";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth-context";
import { useUpgrade } from "@/contexts/upgrade-context";
import { UsageMeter } from "@/components/usage-meter";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { APP_NAV } from "@/lib/nav";
import { FilePreview, PreviewModal } from "@/components/preview";
import { canPreview } from "@/lib/preview";

function fileTypeLabel(filename) {
  const parts = filename.split(".");
  if (parts.length < 2) return "FILE";
  return parts.pop().slice(0, 6).toUpperCase();
}

/**
 * ChatShell — shared layout for the dashboard chat experience.
 * Mobile-first, Claude-grade polish: sticky composer with safe-area,
 * slide-over history drawer, generous tap targets, no layout shift.
 */
export function ChatShell({ chatId = null }) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { triggerUpgrade } = useUpgrade();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isBusy, setIsBusy] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [uploadsOpen, setUploadsOpen] = useState(false);
  const STORAGE_KEY = "refile.uploads.expanded";
  const [uploadsExpanded, setUploadsExpanded] = useState(() => {
    if (typeof window === "undefined") return true; // SSR safe; default true so signed-in users see files immediately
    try {
      return localStorage.getItem(STORAGE_KEY) !== "false"; // default true unless explicitly collapsed
    } catch {
      return true;
    }
  });

  const toggleUploads = () => {
    setUploadsExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  };
  const [mounted, setMounted] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState("");
  const [uploads, setUploads] = useState([]);
  const [uploading, setUploading] = useState([]);
  const [uploadsDragActive, setUploadsDragActive] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const scrollRef = useRef(null);
  const uploadsInputRef = useRef(null);

  useEffect(() => setMounted(true), []);

  // If the user arrived from "Use preset" on a preset detail page, pull the
  // draft prompt out of sessionStorage and seed the composer with it.
  useEffect(() => {
    if (chatId) return; // only on the new-chat surface
    try {
      const raw = sessionStorage.getItem("chat_prompt_draft");
      if (raw) {
        setInitialPrompt(raw);
        sessionStorage.removeItem("chat_prompt_draft");
      }
    } catch {}
  }, [chatId]);
  const isDark = mounted && (resolvedTheme || theme) === "dark";

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : user?.email?.[0]?.toUpperCase() || "U";

  const chats = useQuery(
    api.chats.listMine,
    isAuthenticated ? { limit: 50 } : "skip",
  );
  const chatData = useQuery(
    api.chats.get,
    isAuthenticated && chatId ? { id: chatId } : "skip",
  );
  const generateUploadUrl = useMutation(api.prompts.generateUploadUrl);
  const submit = useMutation(api.prompts.submit);
  const removeChat = useMutation(api.chats.remove);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/");
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (scrollRef.current && chatData?.turns?.length) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [chatData?.turns?.length]);

  // Lock body scroll when a mobile drawer is open
  useEffect(() => {
    if (historyOpen || uploadsOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [historyOpen, uploadsOpen]);

  const openHistory = () => {
    setUploadsOpen(false);
    setHistoryOpen(true);
  };

  const openUploads = () => {
    const isDesktop =
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches;
    if (isDesktop) {
      if (!uploadsExpanded) toggleUploads();
      return;
    }
    setHistoryOpen(false);
    setUploadsOpen(true);
  };

  // Composer paperclip handler. The Uploads panel is ALWAYS visible on
  // desktop (it's the left sidebar) but is a slide-over drawer on mobile.
  // So: on mobile, open the drawer so the user sees/manages uploads; on
  // desktop the panel is already there, so go straight to the OS picker
  // (the picked file lands in that visible panel). Either way the click
  // does something useful and routes through the uploads section.
  const handleComposerAttach = () => {
    const isDesktop =
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches;
    if (isDesktop) {
      uploadsInputRef.current?.click();
    } else {
      openUploads();
    }
  };

  const upsertFiles = (items) => {
    if (!items?.length) return;
    setUploads((prev) => {
      const next = [...prev];
      for (const item of items) {
        const dupIdx = next.findIndex(
          (f) =>
            (item.storageId && f.storageId === item.storageId) ||
            f.filename.toLowerCase() === item.filename.toLowerCase(),
        );
        if (dupIdx >= 0) next[dupIdx] = { ...next[dupIdx], ...item };
        else next.push(item);
      }
      return next;
    });
  };

  const handleUploadFiles = async (incomingFiles) => {
    const files = Array.from(incomingFiles || []);
    if (files.length === 0) return;
    const existingLocalIds = new Set([
      ...uploads.map((u) => u.localId).filter(Boolean),
      ...uploading.map((u) => u.localId).filter(Boolean),
    ]);

    for (const file of files) {
      const localId = `${file.name}-${file.size}-${file.lastModified}`;
      if (existingLocalIds.has(localId)) continue;
      existingLocalIds.add(localId);

      setUploading((prev) => [
        ...prev,
        { localId, filename: file.name, kind: "input", progress: 0 },
      ]);

      try {
        const uploadUrl = await generateUploadUrl();
        const { storageId } = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", uploadUrl);
          xhr.setRequestHeader(
            "Content-Type",
            file.type || "application/octet-stream",
          );
          xhr.upload.onprogress = (event) => {
            if (!event.lengthComputable) return;
            const progress = Math.max(
              2,
              Math.min(100, Math.round((event.loaded / event.total) * 100)),
            );
            setUploading((prev) =>
              prev.map((u) => (u.localId === localId ? { ...u, progress } : u)),
            );
          };
          xhr.onload = () => {
            if (xhr.status < 200 || xhr.status >= 300) {
              reject(new Error(`Upload failed (${xhr.status})`));
              return;
            }
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              reject(new Error("Upload completed but response was invalid"));
            }
          };
          xhr.onerror = () => reject(new Error("Network error during upload"));
          xhr.send(file);
        });
        const localUrl = URL.createObjectURL(file);
        upsertFiles([
          { storageId, filename: file.name, kind: "input", localId, url: localUrl },
        ]);
        setUploading((prev) => prev.filter((u) => u.localId !== localId));
      } catch (err) {
        setUploading((prev) => prev.filter((u) => u.localId !== localId));
        toast.error(`Upload failed for ${file.name}`, {
          description: err?.message,
        });
      }
    }
  };

  useEffect(() => {
    if (!chatData?.turns?.length) return;
    const discovered = [];
    for (const turn of chatData.turns) {
      if (turn.inputStorageIds?.length && turn.inputFilenames?.length) {
        for (let i = 0; i < turn.inputFilenames.length; i++) {
          discovered.push({
            storageId: turn.inputStorageIds[i],
            filename: turn.inputFilenames[i],
            kind: "input",
            url: turn.inputUrls?.[i]?.url ?? null,
          });
        }
      }
      if (turn.outputUrls?.length) {
        for (const out of turn.outputUrls) {
          discovered.push({
            storageId: out.storageId,
            filename: out.filename,
            kind: "output",
            url: out.url,
          });
        }
      }
    }
    upsertFiles(discovered);
  }, [chatData?.turns]);

  const resolvedFileMentions = useMemo(
    () => uploads.map((f) => f.filename),
    [uploads],
  );

  const resolvePromptMentions = (rawPrompt) => {
    let nextPrompt = rawPrompt;
    const pickedStorageIds = [];
    const pickedFilenames = [];
    const mentionMatches = rawPrompt.matchAll(/(^|\s)@(?:"([^"]+)"|([^\s@"]+))/g);

    for (const match of mentionMatches) {
      const rawToken = match[2] ?? match[3];
      const token = rawToken?.toLowerCase();
      if (!token) continue;
      const matched = uploads.find(
        (f) =>
          f.filename.toLowerCase() === token ||
          f.filename.toLowerCase().startsWith(token),
      );
      if (!matched) continue;

      const mentionLiteral = match[2] ? `@"${match[2]}"` : `@${match[3]}`;
      nextPrompt = nextPrompt.replace(mentionLiteral, matched.filename);
      if (matched.storageId && !pickedStorageIds.includes(matched.storageId)) {
        pickedStorageIds.push(matched.storageId);
        pickedFilenames.push(matched.filename);
      }
    }

    return { nextPrompt, pickedStorageIds, pickedFilenames };
  };

  const handleSubmit = async (prompt) => {
    if (!isAuthenticated) {
      toast.error("Sign in to continue");
      return;
    }
    setIsBusy(true);
    try {
      const { nextPrompt, pickedStorageIds, pickedFilenames } =
        resolvePromptMentions(prompt);

      const result = await submit({
        prompt: nextPrompt,
        inputStorageIds: pickedStorageIds,
        inputFilenames: pickedFilenames,
        chatId: chatId ?? undefined,
      });

      if (!chatId && result?.chatId) {
        router.push(`/dashboard/${result.chatId}`);
      }
    } catch (err) {
      // If it's a plan-limit wall, show the upgrade modal instead of a
      // plain error toast. triggerUpgrade returns true when it handled it.
      if (!triggerUpgrade(err)) {
        toast.error("Couldn't process", { description: err?.message });
      }
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
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-3 sm:px-4">
        <span className="flex items-center gap-2 text-[12px] font-medium text-muted-foreground">
          <History className="size-3.5" />
          History
        </span>
        <div className="flex items-center gap-0.5">
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

      {/* Cross-section nav — only on mobile; on desktop the icon rail handles it */}
      <nav className="shrink-0 border-b border-border px-2 py-2 lg:hidden">
        <ul className="space-y-0.5">
          {APP_NAV.map((it) => {
            const Icon = it.icon;
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  onClick={() => setHistoryOpen(false)}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <Icon className="size-4 text-muted-foreground" />
                  {it.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-3">
        {chats === undefined ? (
          <div className="space-y-2 px-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : chats.length === 0 ? (
          <div className="px-3 py-10 text-center text-[12.5px] text-muted-foreground">
            No conversations yet
          </div>
        ) : (
          <ul className="space-y-0.5" aria-label="Chat history">
            {chats.map((c) => {
              const active = c._id === chatId;
              return (
                <li key={c._id}>
                  <div
                    className={cn(
                      "group flex items-stretch rounded-md transition-colors",
                      active ? "bg-muted" : "hover:bg-muted/60",
                    )}
                  >
                    <Link
                      href={`/dashboard/${c._id}`}
                      onClick={() => setHistoryOpen(false)}
                      className="min-w-0 flex-1 px-2.5 py-2.5 text-left outline-none focus:outline-none focus-visible:outline-none"
                    >
                      <p className="line-clamp-1 text-[13px] font-medium text-foreground">
                        {c.title || "Untitled chat"}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-[11.5px] text-muted-foreground">
                        {new Date(c.lastActivity).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric" },
                        )}
                      </p>
                    </Link>
                    <button
                      onClick={(e) => handleDeleteChat(c._id, e)}
                      className="mr-1 my-1 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-opacity hover:bg-muted hover:text-foreground lg:opacity-0 lg:group-hover:opacity-100"
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

      <UsageMeter />
    </>
  );

  const appSidebarExtra = (
    <div className="h-full overflow-y-auto overscroll-contain px-1">
      <div className="flex items-center justify-between px-1 py-1.5">
        <span className="text-[11px] font-medium text-muted-foreground">History</span>
      </div>
      <div className="space-y-0.5">
        {chats === undefined ? (
          <div className="space-y-2 px-1 pt-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : chats.length === 0 ? (
          <div className="px-3 py-10 text-center text-[12.5px] text-muted-foreground">
            No conversations yet
          </div>
        ) : (
          <ul className="space-y-0.5" aria-label="Chat history">
            {chats.map((c) => {
              const active = c._id === chatId;
              return (
                <li key={c._id}>
                  <div
                    className={cn(
                      "group flex items-stretch rounded-md transition-colors",
                      active ? "bg-muted" : "hover:bg-muted/60",
                    )}
                  >
                    <Link
                      href={`/dashboard/${c._id}`}
                      className="min-w-0 flex-1 px-2.5 py-2.5 text-left outline-none focus:outline-none focus-visible:outline-none"
                    >
                      <p className="line-clamp-1 text-[13px] font-medium text-foreground">
                        {c.title || "Untitled chat"}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-[11.5px] text-muted-foreground">
                        {new Date(c.lastActivity).toLocaleDateString(
                          undefined,
                          {
                            month: "short",
                            day: "numeric",
                          },
                        )}
                      </p>
                    </Link>
                    <button
                      onClick={(e) => handleDeleteChat(c._id, e)}
                      className="mr-1 my-1 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-opacity hover:bg-muted hover:text-foreground lg:opacity-0 lg:group-hover:opacity-100"
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
    </div>
  );

  const appSidebarUsage = <UsageMeter />;

  const inExistingChat = Boolean(chatId);

  const uploadsPanel = (
    <>
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-3 sm:px-4 lg:hidden">
        <span className="flex items-center gap-2 text-[12px] font-medium text-muted-foreground">
          <Upload className="size-3.5" />
          Uploads
        </span>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => setUploadsOpen(false)}
          aria-label="Close uploads"
        >
          <X className="size-3.5" />
        </Button>
      </div>
      <div className="px-2 pt-2">
        <Button
          size="sm"
          className="w-full"
          aria-label="Upload files"
          onClick={() => uploadsInputRef.current?.click()}
        >
          <Plus className="size-3.5" />
          Upload files
        </Button>
      </div>
      <div
        className={cn(
          "m-2 rounded-lg border border-dashed border-border p-3 text-center text-[11.5px] text-muted-foreground transition-colors",
          uploadsDragActive && "border-foreground/40 bg-muted/40",
        )}
        onDragOver={(e) => {
          if (!e.dataTransfer?.types?.includes("Files")) return;
          e.preventDefault();
          setUploadsDragActive(true);
        }}
        onDragLeave={(e) => {
          if (e.relatedTarget === null) setUploadsDragActive(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setUploadsDragActive(false);
          handleUploadFiles(e.dataTransfer.files);
        }}
      >
        Drop files here to upload
      </div>

      <input
        ref={uploadsInputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          handleUploadFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {uploading.map((u) => (
          <div
            key={u.localId}
            className="mb-2 rounded-md border border-border p-2"
          >
            <p className="truncate text-[12px] font-medium" title={u.filename}>
              {u.filename}
            </p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-foreground/45 transition-all duration-150"
                style={{ width: `${u.progress || 2}%` }}
              />
            </div>
          </div>
        ))}

        {uploads.length === 0 && uploading.length === 0 ? (
          <div className="px-2 py-6 text-center text-[12px] text-muted-foreground">
            No uploaded or generated files yet
          </div>
        ) : (
          <ul className="space-y-1" aria-label="Uploaded and generated files">
            {uploads.map((f) => {
              const previewable = canPreview(f.filename) && !!f.url;
              return (
              <li
                key={f.storageId || f.filename}
                className="group rounded-md border border-border bg-card px-2.5 py-2"
              >
                <div className="flex items-start gap-2">
                  {previewable ? (
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewItem({ filename: f.filename, url: f.url })
                      }
                      className="shrink-0 rounded-md transition-opacity hover:opacity-80"
                      aria-label={`Preview ${f.filename}`}
                    >
                      <FilePreview
                        filename={f.filename}
                        url={f.url}
                        mode="inline"
                        size="sm"
                      />
                    </button>
                  ) : (
                    <div className="shrink-0">
                      <FilePreview
                        filename={f.filename}
                        url={f.url}
                        mode="inline"
                        size="sm"
                      />
                    </div>
                  )}
                  <div className="flex flex-1 min-w-0 items-start justify-between gap-2">
                    <span
                      className="truncate text-mono text-[12px]"
                      title={f.filename}
                    >
                      {f.filename}
                    </span>
                    <div className="shrink-0">
                      <span className="inline-flex rounded border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground group-hover:hidden">
                        {fileTypeLabel(f.filename)}
                      </span>
                      {f.url ? (
                        <a
                          href={f.url}
                          download={f.filename}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hidden rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground group-hover:inline-flex"
                          aria-label={`Download ${f.filename}`}
                          title="Download"
                        >
                          <Download className="size-3.5" />
                        </a>
                      ) : (
                        <span
                          className="hidden rounded p-1 text-muted-foreground/60 group-hover:inline-flex"
                          title="Download unavailable"
                        >
                          <Download className="size-3.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );

  return (
    <AppShell
      mode="app"
      appSidebarNavExtra={appSidebarExtra}
      appSidebarFooterExtra={appSidebarUsage}
    >
      <div
        className={cn(
          "grid h-full min-h-0 grid-cols-1 grid-rows-1 transition-[grid-template-columns] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          uploadsExpanded
            ? "lg:grid-cols-[300px_1fr]"
            : "lg:grid-cols-[44px_1fr]",
        )}
      >
        <aside
          className={cn(
            "hidden h-full min-h-0 flex-col border-r border-border lg:flex",
            !uploadsExpanded && "overflow-hidden",
          )}
        >
          {uploadsExpanded ? (
            <>
              <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/70 px-3">
                <span className="text-[12px] font-medium text-muted-foreground">
                  Uploads
                  {uploads.length + uploading.length > 0 && (
                    <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-muted px-1 text-[10px] tabular-nums text-foreground">
                      {uploads.length + uploading.length}
                    </span>
                  )}
                </span>
                <button
                  onClick={toggleUploads}
                  aria-label="Collapse uploads"
                  title="Collapse uploads"
                  className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <PanelRightClose className="size-3.5" />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                {uploadsPanel}
              </div>
            </>
          ) : (
            <button
              onClick={toggleUploads}
              aria-label="Expand uploads"
              title="Expand uploads"
              className="group flex h-full w-full flex-col items-center justify-start gap-3 py-4 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              <PanelLeftOpen className="size-4" />
              {uploads.length + uploading.length > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-medium tabular-nums text-background">
                  {uploads.length + uploading.length}
                </span>
              )}
              <span className="text-[10.5px] font-medium uppercase tracking-wider [writing-mode:vertical-rl] [transform:rotate(180deg)]">
                Uploads
              </span>
            </button>
          )}
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
                className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden"
                onClick={() => setHistoryOpen(false)}
              />
              <motion.aside
                key="history-drawer"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="fixed inset-y-0 left-0 z-50 flex w-[min(86vw,320px)] flex-col border-r border-border bg-background shadow-2xl lg:hidden"
                style={{
                  paddingTop: "env(safe-area-inset-top)",
                  paddingBottom: "env(safe-area-inset-bottom)",
                }}
              >
                {historyPanel}
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {uploadsOpen && (
            <>
              <motion.div
                key="uploads-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden"
                onClick={() => setUploadsOpen(false)}
              />
              <motion.aside
                key="uploads-drawer"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="fixed inset-y-0 left-0 z-50 flex w-[min(86vw,320px)] flex-col border-r border-border bg-background shadow-2xl lg:hidden"
                style={{
                  paddingTop: "env(safe-area-inset-top)",
                  paddingBottom: "env(safe-area-inset-bottom)",
                }}
              >
                {uploadsPanel}
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <div className="flex h-full min-h-0 flex-col">
          {/* Header — glassy, sticky, with safe area */}
          <header
            className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-border glass px-2 sm:px-5"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
          >
            <div className="flex min-w-0 items-center gap-1 sm:gap-2.5">
              <Button
                size="icon"
                variant="ghost"
                onClick={openHistory}
                aria-label="Open history"
                className="lg:hidden"
              >
                <PanelLeft className="size-[18px]" />
              </Button>
              <h1 className="truncate pl-1 text-[14px] font-medium tracking-tight sm:pl-0 sm:text-[14.5px]">
                {chat ? chat.title : chatId ? "Loading…" : "New chat"}
              </h1>
            </div>
            <div className="flex items-center gap-0.5">
              <Button
                size="icon"
                variant="ghost"
                onClick={openUploads}
                aria-label="Open uploads"
                className="lg:hidden"
              >
                <Upload className="size-[18px]" />
              </Button>
              {chat && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => handleDeleteChat(chat._id, e)}
                  className="hidden sm:inline-flex"
                >
                  <Trash2 className="size-3.5" />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
              )}

              {/* Mobile-only account menu (theme, sign out) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="Account menu"
                    className="ml-0.5 inline-flex size-9 items-center justify-center rounded-md transition-colors hover:bg-muted lg:hidden"
                  >
                    <Avatar className="size-7">
                      <AvatarImage
                        src={user?.picture}
                        alt={user?.name || "Account"}
                      />
                      <AvatarFallback className="text-[10.5px]">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={8}
                  className="w-56"
                >
                  {user && (
                    <>
                      <DropdownMenuLabel className="normal-case tracking-normal text-foreground">
                        <div className="flex flex-col">
                          <span className="truncate text-[13px] font-medium">
                            {user.name}
                          </span>
                          <span className="truncate text-[11.5px] font-normal text-muted-foreground">
                            {user.email}
                          </span>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem
                    onClick={() => setTheme(isDark ? "light" : "dark")}
                  >
                    {isDark ? (
                      <Sun className="size-3.5" />
                    ) : (
                      <Moon className="size-3.5" />
                    )}
                    {isDark ? "Light mode" : "Dark mode"}
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings className="size-3.5" /> Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={logout}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="size-3.5" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto overscroll-contain"
          >
            <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6 sm:py-8">
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
                <div className="space-y-7 sm:space-y-10">
                  <AnimatePresence initial={false}>
                    {turns.map((t) => (
                      <Turn key={t._id} turn={t} />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          {/* Sticky composer dock — glass + safe area for iOS notch/home-bar */}
          <div
            className="shrink-0 border-t border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="mx-auto w-full max-w-3xl px-3 pb-3 pt-2.5 sm:px-6 sm:pb-5 sm:pt-4">
              <Composer
                onSubmit={handleSubmit}
                onOpenUploads={handleComposerAttach}
                isBusy={isBusy}
                autoFocus
                initialPrompt={initialPrompt}
                fileMentions={resolvedFileMentions}
                placeholder={
                  inExistingChat && turns.length > 0
                    ? "Follow up — ask anything…"
                    : "Ask anything, reference files with @filename…"
                }
              />
              <p className="mt-2 hidden text-center text-[11px] text-muted-foreground sm:block">
                ReFile is an AI and can make mistakes. Check important results.
              </p>
            </div>
          </div>
        </div>
      </div>

      <PreviewModal
        open={!!previewItem}
        onOpenChange={(o) => !o && setPreviewItem(null)}
        filename={previewItem?.filename}
        url={previewItem?.url}
      >
        {previewItem && (
          <FilePreview
            filename={previewItem.filename}
            url={previewItem.url}
            mode="modal"
          />
        )}
      </PreviewModal>
    </AppShell>
  );
}

function WelcomeState({ firstName }) {
  const suggestions = [
    "Extract audio from this video as 192 kbps MP3",
    "Resize these images to 1080p, save as WebP",
    "Merge these PDFs and compress under 2 MB",
    "Convert this MP4 to a 1080p H.264 video",
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="mt-2 sm:mt-10"
    >
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-card shadow-sm">
          <Sparkles className="size-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-balance text-[20px] font-semibold tracking-tight sm:text-[22px]">
            Hi {firstName} — what are we converting?
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground sm:text-[14px]">
            Drop files anywhere on this page, then describe the outcome.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-2 sm:mt-8 sm:grid-cols-2">
        {suggestions.map((s) => (
          <div
            key={s}
            className="surface px-4 py-3 text-[13px] leading-relaxed text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
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
      className="space-y-5 sm:space-y-6"
    >
      {/* User message */}
      <div className="flex justify-end">
        <div className="max-w-[85%] sm:max-w-[75%]">
          <div className="rounded-2xl rounded-br-md bg-muted px-3.5 py-2.5 text-[14.5px] leading-relaxed text-foreground">
            {turn.prompt}
          </div>
          {turn.inputFilenames?.length > 0 && (
            <div className="mt-1.5 flex flex-wrap justify-end gap-1">
              {turn.inputFilenames.map((n, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-md border border-border bg-card/60 px-2 py-0.5 text-mono text-[11px] text-muted-foreground"
                >
                  {n}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI message */}
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
          <Sparkles className="size-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <AIResponse prompt={turn} />
        </div>
      </div>
    </motion.div>
  );
}
