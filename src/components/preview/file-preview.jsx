"use client";

import * as React from "react";
import {
  Image as ImageIcon,
  Video,
  Music,
  Play,
  FileText,
  Table,
  FileCode,
  File as FileIcon,
  Loader2,
} from "lucide-react";
import dynamic from "next/dynamic";
import Papa from "papaparse";
import { cn } from "@/lib/utils";
import { PREVIEW_KIND, previewKindFor, fileExtLabel } from "@/lib/preview";

const PdfPreview = dynamic(() => import("./pdf-preview"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[40vh] w-full items-center justify-center">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
  ),
});

function iconFor(kind) {
  switch (kind) {
    case PREVIEW_KIND.IMAGE:
      return ImageIcon;
    case PREVIEW_KIND.VIDEO:
      return Video;
    case PREVIEW_KIND.AUDIO:
      return Music;
    case PREVIEW_KIND.PDF:
      return FileText;
    case PREVIEW_KIND.CSV:
      return Table;
    case PREVIEW_KIND.TEXT:
      return FileCode;
    default:
      return FileIcon;
  }
}

function InlinePlaceholder({ kind, filename }) {
  const Icon = iconFor(kind);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={cn(
          "flex size-10 items-center justify-center rounded-md border border-border bg-muted/40"
        )}
      >
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {fileExtLabel(filename)}
      </span>
    </div>
  );
}

function ModalPlaceholder({ kind, filename }) {
  const Icon = iconFor(kind);
  return (
    <div className="flex h-full min-h-[40vh] w-full flex-col items-center justify-center gap-3">
      <div
        className={cn(
          "flex size-16 items-center justify-center rounded-lg border border-border bg-muted/40"
        )}
      >
        <Icon className="size-8 text-muted-foreground" />
      </div>
      <span className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
        {fileExtLabel(filename)}
      </span>
    </div>
  );
}

function ImageWithFallback({ src, alt, className, fallback }) {
  const [errored, setErrored] = React.useState(false);
  if (errored) return fallback;
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={className}
      onError={() => setErrored(true)}
    />
  );
}

export function FilePreview({ filename, url, mode = "inline", size = "sm" }) {
  const kind = previewKindFor(filename);
  const Placeholder = mode === "modal" ? ModalPlaceholder : InlinePlaceholder;

  switch (kind) {
    // AGENT-B: IMAGE
    case PREVIEW_KIND.IMAGE: {
      if (!url) return <Placeholder kind={kind} filename={filename} />;
      if (mode === "modal") {
        return (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3">
            <ImageWithFallback
              src={url}
              alt={filename}
              className="max-h-[75vh] max-w-full rounded-lg border border-border object-contain"
              fallback={<ModalPlaceholder kind={kind} filename={filename} />}
            />
            <span
              className="max-w-full truncate text-[12px] text-muted-foreground"
              title={filename}
            >
              {filename}
            </span>
          </div>
        );
      }
      return (
        <ImageWithFallback
          src={url}
          alt={filename}
          className="size-12 shrink-0 rounded-md border border-border object-cover"
          fallback={<InlinePlaceholder kind={kind} filename={filename} />}
        />
      );
    }

    // AGENT-B: VIDEO
    case PREVIEW_KIND.VIDEO: {
      if (!url) return <Placeholder kind={kind} filename={filename} />;
      if (mode === "modal") {
        return (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3">
            <video
              src={url}
              controls
              preload="metadata"
              className="max-h-[70vh] w-full rounded-lg bg-black"
            />
            <span
              className="max-w-full truncate text-[12px] text-muted-foreground"
              title={filename}
            >
              {filename}
            </span>
          </div>
        );
      }
      return (
        <div className="relative size-12 shrink-0 overflow-hidden rounded-md border border-border bg-black">
          <video
            src={url}
            preload="metadata"
            muted
            playsInline
            className="size-full object-cover opacity-80"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Play className="size-4 fill-white text-white" />
          </div>
        </div>
      );
    }

    // AGENT-B: AUDIO
    case PREVIEW_KIND.AUDIO: {
      if (!url) return <Placeholder kind={kind} filename={filename} />;
      if (mode === "modal") {
        return (
          <div className="flex h-full min-h-[40vh] w-full flex-col items-center justify-center gap-4 px-4">
            <div className="flex size-16 items-center justify-center rounded-full border border-border bg-muted/40">
              <Music className="size-8 text-muted-foreground" />
            </div>
            <span
              className="max-w-full truncate text-[12px] text-muted-foreground"
              title={filename}
            >
              {filename}
            </span>
            <audio
              src={url}
              controls
              preload="metadata"
              className="w-full max-w-md"
            />
          </div>
        );
      }
      return (
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex size-12 items-center justify-center rounded-md border border-border bg-muted/40">
            <Music className="size-5 text-muted-foreground" />
          </div>
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {fileExtLabel(filename)}
          </span>
        </div>
      );
    }

    // AGENT-C: PDF
    case PREVIEW_KIND.PDF: {
      if (!url) return <Placeholder kind={kind} filename={filename} />;
      return <PdfPreview url={url} filename={filename} mode={mode} />;
    }

    // AGENT-C: TEXT
    case PREVIEW_KIND.TEXT: {
      if (!url) return <Placeholder kind={kind} filename={filename} />;
      if (mode === "modal") {
        return <TextPreview url={url} filename={filename} />;
      }
      return <InlinePlaceholder kind={kind} filename={filename} />;
    }

    // AGENT-D: CSV
    case PREVIEW_KIND.CSV: {
      if (mode === "modal") {
        if (!url) {
          return (
            <div className="flex h-full min-h-[40vh] w-full flex-col items-center justify-center gap-3 text-center">
              <div className="flex size-16 items-center justify-center rounded-lg border border-border bg-muted/40">
                <Table className="size-8 text-muted-foreground" />
              </div>
              <p className="text-[13px] text-muted-foreground">
                Couldn&apos;t preview CSV — try downloading
              </p>
            </div>
          );
        }
        return <CsvPreview url={url} filename={filename} />;
      }
      return (
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex size-12 items-center justify-center rounded-md border border-border bg-muted/40">
            <Table className="size-5 text-muted-foreground" />
          </div>
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {fileExtLabel(filename)}
          </span>
        </div>
      );
    }

    case PREVIEW_KIND.UNKNOWN:
    default:
      return <Placeholder kind={PREVIEW_KIND.UNKNOWN} filename={filename} />;
  }
}


function TextPreview({ url, filename }) {
  const [text, setText] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [errored, setErrored] = React.useState(false);
  const [truncated, setTruncated] = React.useState(false);

  const MAX_BYTES = 200 * 1024;

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrored(false);
    setTruncated(false);
    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("fetch failed");
        const contentLength = Number(res.headers.get("Content-Length") || 0);
        const raw = await res.text();
        let body = raw;
        let isTruncated = false;
        if (raw.length > MAX_BYTES) {
          body = raw.slice(0, MAX_BYTES);
          isTruncated = true;
        } else if (contentLength && contentLength > MAX_BYTES) {
          isTruncated = true;
        }
        if (cancelled) return;
        setText(body);
        setTruncated(isTruncated);
        setLoading(false);
      } catch {
        if (cancelled) return;
        setErrored(true);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (loading) {
    return (
      <div className="flex h-full min-h-[40vh] w-full items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (errored) {
    return (
      <div className="flex h-full min-h-[40vh] w-full flex-col items-center justify-center gap-3 text-center">
        <div className="flex size-16 items-center justify-center rounded-lg border border-border bg-muted/40">
          <FileCode className="size-8 text-muted-foreground" />
        </div>
        <p className="text-[13px] text-muted-foreground">
          Couldn&apos;t preview file
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col gap-2">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
        <span
          className="min-w-0 truncate text-[12px] text-muted-foreground"
          title={filename}
        >
          {filename}
        </span>
        {truncated && (
          <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
            Showing first 200KB
          </span>
        )}
      </div>
      <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted/30 p-4 font-mono text-[12px] text-foreground">
        {text}
      </pre>
    </div>
  );
}

function CsvPreview({ url, filename }) {
  const [rows, setRows] = React.useState([]);
  const [fields, setFields] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [errored, setErrored] = React.useState(false);

  const isTsv = React.useMemo(
    () =>
      typeof filename === "string" &&
      filename.split("?")[0].split("#")[0].toLowerCase().endsWith(".tsv"),
    [filename]
  );

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrored(false);
    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("fetch failed");
        const raw = await res.text();
        const text = raw.length > 1_000_000 ? raw.slice(0, 1_000_000) : raw;
        const parsed = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          ...(isTsv ? { delimiter: "\t" } : {}),
        });
        if (cancelled) return;
        const data = Array.isArray(parsed.data) ? parsed.data : [];
        const cols =
          parsed.meta && Array.isArray(parsed.meta.fields)
            ? parsed.meta.fields
            : data.length > 0
              ? Object.keys(data[0])
              : [];
        setRows(data);
        setFields(cols);
        setLoading(false);
      } catch {
        if (cancelled) return;
        setErrored(true);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url, isTsv]);

  if (loading) {
    return (
      <div className="flex h-full min-h-[40vh] w-full items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (errored || fields.length === 0) {
    return (
      <div className="flex h-full min-h-[40vh] w-full flex-col items-center justify-center gap-3 text-center">
        <div className="flex size-16 items-center justify-center rounded-lg border border-border bg-muted/40">
          <Table className="size-8 text-muted-foreground" />
        </div>
        <p className="text-[13px] text-muted-foreground">
          Couldn&apos;t preview CSV — try downloading
        </p>
      </div>
    );
  }

  const display = rows.slice(0, 50);

  return (
    <div className="flex h-full w-full flex-col gap-2">
      <p className="text-[12px] text-muted-foreground">
        Showing first {display.length} rows of {rows.length}
      </p>
      <div className="overflow-auto max-h-[70vh] rounded-lg border border-border">
        <table className="w-full text-[12px] text-mono">
          <thead>
            <tr className="bg-muted/60 sticky top-0 border-b border-border">
              {fields.map((f) => (
                <th
                  key={f}
                  className="px-3 py-2 border-r border-border/60 last:border-r-0 align-top whitespace-nowrap text-left font-medium text-foreground"
                >
                  {f}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {display.map((row, i) => (
              <tr
                key={i}
                className="border-b border-border/40 last:border-b-0 hover:bg-muted/30"
              >
                {fields.map((f) => (
                  <td
                    key={f}
                    className="px-3 py-2 border-r border-border/60 last:border-r-0 align-top whitespace-nowrap text-muted-foreground"
                  >
                    {row[f] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default FilePreview;
