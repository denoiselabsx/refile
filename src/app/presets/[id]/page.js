"use client";

import Link from "next/link";
import { useEffect, useState, use } from "react";
import {
  ArrowLeft,
  Heart,
  Play,
  Share2,
  Edit,
  Trash2,
  Flag,
  Copy,
  Check,
  Terminal,
  FileInput,
  FileOutput,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/auth-context";

function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function PresetDetailPage(props) {
  const params = use(props.params);
  const { isAuthenticated, user } = useAuth();
  const [preset, setPreset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/presets/${params.id}`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        if (cancelled) return;
        setPreset(data.preset);
        setLiked(data.preset?.isLiked || false);
        setLikeCount(data.preset?.likes_count || 0);
      } catch {
        if (!cancelled) setPreset(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const isOwner = user?.id === preset?.user_id;

  const copyCommand = async () => {
    if (!preset?.command_template) return;
    try {
      await navigator.clipboard.writeText(preset.command_template);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated) {
      window.location.href = "/login/google";
      return;
    }
    try {
      const res = await fetch(`/api/presets/${params.id}/like`, { method: "POST" });
      if (!res.ok) throw new Error();
      setLiked((v) => !v);
      setLikeCount((v) => (liked ? Math.max(0, v - 1) : v + 1));
    } catch {
      toast.error("Couldn't update like");
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/presets/${params.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Preset deleted");
      window.location.href = "/presets";
    } catch {
      toast.error("Couldn't delete preset");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-5xl px-5 py-10">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="mt-6 h-9 w-2/3" />
          <Skeleton className="mt-3 h-4 w-1/2" />
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (!preset) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl px-5 py-16">
          <EmptyState
            icon={Sparkles}
            title="Preset not found"
            description="The preset you're looking for doesn't exist or has been removed."
            action={
              <Button asChild>
                <Link href="/presets">Browse presets</Link>
              </Button>
            }
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-5 py-10">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/presets">
            <ArrowLeft className="size-3.5" /> All presets
          </Link>
        </Button>

        {/* Title block */}
        <div className="mt-5 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="capitalize">{preset.category}</Badge>
              {preset.tool && (
                <Badge variant="secondary" className="capitalize">{preset.tool}</Badge>
              )}
              {preset.is_verified && <Badge variant="success">Verified</Badge>}
              {!preset.is_public && <Badge variant="outline">Private</Badge>}
            </div>
            <h1 className="mt-3 text-h1 tracking-tight">{preset.name}</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              {preset.description}
            </p>
          </div>
        </div>

        {/* Action row */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Button size="sm" disabled>
            <Play className="size-3.5" /> Use preset
          </Button>
          <Button size="sm" variant="outline" onClick={handleLike}>
            <Heart className={`size-3.5 ${liked ? "fill-destructive text-destructive" : ""}`} />
            {likeCount}
          </Button>
          <Button size="sm" variant="outline" onClick={copyCommand}>
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy command"}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleShare}>
            <Share2 className="size-3.5" /> Share
          </Button>
          {isOwner ? (
            <>
              <Separator orientation="vertical" className="mx-1 h-5" />
              <Button size="sm" variant="ghost" asChild>
                <Link href={`/presets/${params.id}/edit`}>
                  <Edit className="size-3.5" /> Edit
                </Link>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmDelete(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="size-3.5" /> Delete
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" className="text-muted-foreground">
              <Flag className="size-3.5" /> Report
            </Button>
          )}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_280px]">
          {/* Main column */}
          <div className="space-y-6">
            <div className="surface overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  <Terminal className="size-3.5" />
                  <span>Command template</span>
                </div>
                <Button size="sm" variant="ghost" onClick={copyCommand}>
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <pre className="code-block rounded-none border-0 bg-transparent">
                {preset.command_template}
              </pre>
            </div>

            {preset.input_file_patterns?.length > 0 && (
              <div className="surface p-5">
                <h3 className="flex items-center gap-2 text-[13.5px] font-semibold tracking-tight">
                  <FileInput className="size-3.5" /> Inputs
                </h3>
                <div className="mt-4 space-y-3">
                  {preset.input_file_patterns.map((p, i) => (
                    <div key={i} className="rounded-md border border-border p-3.5">
                      <div className="text-mono text-[12px] text-foreground">
                        {p.name || `input_${i + 1}`}
                      </div>
                      {p.description && (
                        <p className="mt-1 text-[12.5px] text-muted-foreground">{p.description}</p>
                      )}
                      {p.extensions?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {p.extensions.map((ext) => (
                            <Badge key={ext} variant="outline" className="text-[10.5px]">
                              {ext}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {preset.output_file_patterns?.length > 0 && (
              <div className="surface p-5">
                <h3 className="flex items-center gap-2 text-[13.5px] font-semibold tracking-tight">
                  <FileOutput className="size-3.5" /> Outputs
                </h3>
                <div className="mt-4 space-y-3">
                  {preset.output_file_patterns.map((p, i) => (
                    <div key={i} className="rounded-md border border-border p-3.5">
                      <div className="text-mono text-[12px]">{p.name || `output_${i + 1}`}</div>
                      {p.description && (
                        <p className="mt-1 text-[12.5px] text-muted-foreground">{p.description}</p>
                      )}
                      {p.template && (
                        <pre className="code-block mt-2 text-[11.5px]">{p.template}</pre>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="surface p-4">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Author
              </div>
              <div className="mt-3 flex items-center gap-3">
                <Avatar className="size-9">
                  <AvatarImage src={preset.users?.picture} alt={preset.users?.name} />
                  <AvatarFallback>
                    {preset.users?.name?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium">
                    {preset.users?.name || "Unknown"}
                  </div>
                  <div className="text-[11.5px] text-muted-foreground">
                    {formatDate(preset.created_at)}
                  </div>
                </div>
              </div>
            </div>

            <div className="surface divide-y divide-border">
              <Row label="Used" value={`${preset.usage_count || 0} times`} />
              <Row label="Likes" value={likeCount} />
              <Row label="Visibility" value={preset.is_public ? "Public" : "Private"} />
              <Row label="Category" value={preset.category} capitalize />
              {preset.tool && <Row label="Tool" value={preset.tool} capitalize />}
            </div>

            {preset.tags?.length > 0 && (
              <div className="surface p-4">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Tags
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {preset.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/presets?tag=${encodeURIComponent(tag)}`}
                      className="inline-flex items-center rounded-md border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this preset?</DialogTitle>
            <DialogDescription>
              This permanently removes “{preset?.name}”. People who saved it will lose access.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} loading={deleting}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Row({ label, value, capitalize = false }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-[12.5px] text-muted-foreground">{label}</span>
      <span className={`text-[12.5px] font-medium ${capitalize ? "capitalize" : ""}`}>
        {value}
      </span>
    </div>
  );
}
