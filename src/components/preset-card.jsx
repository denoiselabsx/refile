"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Heart,
  Play,
  ArrowUpRight,
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  Archive,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS = {
  image: ImageIcon,
  video: Video,
  audio: Music,
  pdf: FileText,
  document: FileText,
  archive: Archive,
};

function CategoryIcon({ category, className }) {
  const Icon = CATEGORY_ICONS[category] || Zap;
  return <Icon className={className} />;
}

function formatDate(d) {
  if (!d) return "";
  const date = new Date(d);
  const now = new Date();
  const days = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (days < 1) return "Today";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function PresetCard({ preset, onLike, isLiked = false }) {
  const [liked, setLiked] = useState(isLiked);
  const [likeCount, setLikeCount] = useState(preset.likesCount || 0);

  const handleLike = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await onLike?.(preset._id);
      setLiked((v) => !v);
      setLikeCount((v) => (liked ? Math.max(0, v - 1) : v + 1));
    } catch {
      // parent handles toast
    }
  };

  return (
    <Link
      href={`/presets/${preset._id}`}
      className="group surface relative flex flex-col p-5 transition-all duration-200 hover:border-border-strong hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between">
        <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground">
          <CategoryIcon category={preset.category} className="size-4" />
        </div>
        <div className="flex items-center gap-1.5">
          {preset.isVerified && (
            <Badge variant="outline" className="text-[10.5px]">
              Verified
            </Badge>
          )}
          <ArrowUpRight className="size-3.5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </div>
      </div>

      <h3 className="mt-4 line-clamp-1 text-[14.5px] font-semibold tracking-tight">
        {preset.name}
      </h3>
      <p className="mt-1 line-clamp-2 min-h-[2.6em] text-[13px] leading-relaxed text-muted-foreground">
        {preset.description}
      </p>

      {preset.tags?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {preset.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10.5px]">
              {tag}
            </Badge>
          ))}
          {preset.tags.length > 3 && (
            <Badge variant="outline" className="text-[10.5px]">
              +{preset.tags.length - 3}
            </Badge>
          )}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between border-t border-border pt-3.5">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar className="size-5">
            <AvatarImage src={preset.creator?.image} alt={preset.creator?.name} />
            <AvatarFallback className="text-[9px]">
              {preset.creator?.name?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-[11.5px] text-muted-foreground">
            {preset.creator?.name || "Unknown"}
          </span>
          <span className="text-[11px] text-muted-foreground">·</span>
          <span className="shrink-0 text-[11.5px] text-muted-foreground">
            {formatDate(preset._creationTime)}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11.5px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Play className="size-3" />
            {preset.usageCount || 0}
          </span>
          <button
            onClick={handleLike}
            className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
            aria-label={liked ? "Unlike" : "Like"}
          >
            <Heart
              className={cn(
                "size-3.5 transition-colors",
                liked && "fill-destructive text-destructive"
              )}
            />
            {likeCount}
          </button>
        </div>
      </div>
    </Link>
  );
}
