"use client";

import { memo } from "react";
import { Handle, Position } from "reactflow";
import { Image as ImageIcon, Video, Music, FileText, FileCode, Wand2 } from "lucide-react";

const ICONS = {
  image: ImageIcon,
  video: Video,
  audio: Music,
  pdf: FileText,
};

export const PresetNode = memo(({ data, selected }) => {
  const Icon = ICONS[data.category] || FileCode;

  return (
    <div
      className="rounded-lg border bg-card transition-all"
      style={{
        borderColor: selected ? "var(--foreground)" : "var(--border)",
        boxShadow: selected
          ? "0 0 0 1px var(--foreground), 0 8px 28px -8px rgba(0,0,0,0.35)"
          : "0 1px 0 0 var(--border), 0 6px 18px -10px rgba(0,0,0,0.18)",
        minWidth: 220,
        maxWidth: 260,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: "var(--foreground)",
          width: 9,
          height: 9,
          border: "2px solid var(--background)",
        }}
      />

      <div className="flex items-center gap-2 border-b border-border px-3.5 py-2.5">
        <div className="flex size-5 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="size-3" />
        </div>
        <span className="truncate text-[12.5px] font-semibold tracking-tight">
          {data.label}
        </span>
      </div>

      <div className="px-3.5 py-3">
        <p className="line-clamp-2 text-[11.5px] leading-relaxed text-muted-foreground">
          {data.description}
        </p>
        <div className="mt-2 inline-flex items-center gap-1 text-[10.5px] text-muted-foreground">
          <Wand2 className="size-2.5" />
          <span className="capitalize">{data.tool}</span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: "var(--foreground)",
          width: 9,
          height: 9,
          border: "2px solid var(--background)",
        }}
      />
    </div>
  );
});

PresetNode.displayName = "PresetNode";
