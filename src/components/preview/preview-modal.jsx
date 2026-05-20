"use client";

import * as React from "react";
import { Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function PreviewModal({ open, onOpenChange, filename, url, children }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "w-full max-w-5xl max-h-[90vh] p-0 gap-0 overflow-hidden",
          "grid grid-rows-[auto_1fr]"
        )}
      >
        <div className="flex items-center gap-3 border-b border-border px-5 py-3.5 pr-14">
          <div className="min-w-0 flex-1">
            <DialogTitle
              className="truncate text-[14px] font-semibold"
              title={filename}
            >
              {filename || "Preview"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              File preview
            </DialogDescription>
          </div>
          {url ? (
            <a
              href={url}
              download={filename}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-[12.5px] font-medium text-background transition-opacity hover:opacity-90"
            >
              <Download className="size-3.5" />
              Download
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex shrink-0 cursor-not-allowed items-center gap-1.5 rounded-lg bg-foreground/40 px-3 py-1.5 text-[12.5px] font-medium text-background"
            >
              <Download className="size-3.5" />
              Download
            </button>
          )}
        </div>
        <div className="min-h-[50vh] overflow-auto p-5">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

export default PreviewModal;
