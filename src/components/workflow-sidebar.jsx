"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import {
  Search,
  Loader2,
  Package,
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  Heart,
  Play,
  GripVertical,
  Archive,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { api } from "../../convex/_generated/api";

const CATEGORIES = [
  { id: "all", name: "All", icon: Package },
  { id: "image", name: "Image", icon: ImageIcon },
  { id: "video", name: "Video", icon: Video },
  { id: "audio", name: "Audio", icon: Music },
  { id: "pdf", name: "PDF", icon: FileText },
  { id: "document", name: "Docs", icon: FileText },
  { id: "archive", name: "Archive", icon: Archive },
];

const CATEGORY_ICONS = {
  image: ImageIcon,
  video: Video,
  audio: Music,
  pdf: FileText,
  document: FileText,
  archive: Archive,
};

// Small starter catalogue shown when the user has no presets yet — so the
// workflow canvas is never empty on day one. Once the user (or community)
// publishes presets, real ones take over.
const STARTER_PRESETS = [
  {
    id: "starter-image-resize",
    name: "Resize image",
    description: "Resize while preserving aspect ratio.",
    category: "image",
    tool: "imagemagick",
    likesCount: 0,
    usageCount: 0,
    isStarter: true,
  },
  {
    id: "starter-image-compress",
    name: "Compress image",
    description: "Reduce file size while keeping quality.",
    category: "image",
    tool: "imagemagick",
    likesCount: 0,
    usageCount: 0,
    isStarter: true,
  },
  {
    id: "starter-video-extract-audio",
    name: "Extract audio",
    description: "Pull audio out of a video as MP3.",
    category: "video",
    tool: "ffmpeg",
    likesCount: 0,
    usageCount: 0,
    isStarter: true,
  },
  {
    id: "starter-video-compress",
    name: "Compress video",
    description: "Re-encode at H.265 for smaller files.",
    category: "video",
    tool: "ffmpeg",
    likesCount: 0,
    usageCount: 0,
    isStarter: true,
  },
  {
    id: "starter-pdf-compress",
    name: "Compress PDF",
    description: "Run Ghostscript at /ebook quality.",
    category: "pdf",
    tool: "ghostscript",
    likesCount: 0,
    usageCount: 0,
    isStarter: true,
  },
];

export function WorkflowSidebar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const livePresets = useQuery(api.presets.list, { limit: 60 });
  const loading = livePresets === undefined;

  const presets = useMemo(() => {
    const live = (livePresets || []).map((p) => ({
      id: p._id,
      name: p.name,
      description: p.description,
      category: p.category,
      tool: p.tool,
      likesCount: p.likesCount || 0,
      usageCount: p.usageCount || 0,
      isStarter: false,
    }));
    // Always include starters so a brand new account isn't staring at an
    // empty sidebar. Real presets render first.
    return [...live, ...STARTER_PRESETS];
  }, [livePresets]);

  const filtered = useMemo(() => {
    return presets.filter((p) => {
      if (selectedCategory !== "all" && p.category !== selectedCategory)
        return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    });
  }, [presets, searchQuery, selectedCategory]);

  const onDragStart = (event, preset) => {
    event.dataTransfer.setData("application/reactflow", JSON.stringify(preset));
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="flex h-full w-full flex-col border-r border-border bg-background sm:w-72">
      <div className="border-b border-border p-3 sm:p-4">
        <h2 className="text-[13px] font-semibold tracking-tight">Preset library</h2>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search presets…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border p-3">
        {CATEGORIES.map((category) => {
          const Icon = category.icon;
          const isSelected = selectedCategory === category.id;
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11.5px] transition-colors ${
                isSelected
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-transparent text-muted-foreground hover:border-border-strong hover:text-foreground"
              }`}
            >
              <Icon className="size-3" />
              {category.name}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-3 py-10 text-center text-[12px] text-muted-foreground">
            No presets match
          </div>
        ) : (
          <ul className="space-y-1.5">
            {filtered.map((preset) => {
              const Icon = CATEGORY_ICONS[preset.category] || Package;
              return (
                <li
                  key={preset.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, preset)}
                  className="group flex cursor-grab items-start gap-2.5 rounded-md border border-border bg-card p-2.5 transition-colors hover:border-border-strong active:cursor-grabbing"
                >
                  <GripVertical className="mt-0.5 size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Icon className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="line-clamp-1 text-[12.5px] font-medium tracking-tight">
                        {preset.name}
                      </h3>
                      {preset.isStarter && (
                        <Sparkles
                          className="size-2.5 shrink-0 text-muted-foreground"
                          aria-label="Starter"
                        />
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed text-muted-foreground">
                      {preset.description}
                    </p>
                    {!preset.isStarter && (
                      <div className="mt-1.5 flex items-center gap-2.5 text-[10.5px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Heart className="size-2.5" />
                          {preset.likesCount}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Play className="size-2.5" />
                          {preset.usageCount}
                        </span>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-border bg-muted/30 px-4 py-3 text-[11px] text-muted-foreground">
        Drag presets onto the canvas to build your workflow.
      </div>
    </div>
  );
}
