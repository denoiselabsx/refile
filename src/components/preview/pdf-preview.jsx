"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, FileText, Loader2 } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import { PREVIEW_KIND, fileExtLabel } from "@/lib/preview";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function InlinePlaceholder({ filename }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex h-16 w-12 items-center justify-center rounded-md border border-border bg-muted/40">
        <FileText className="size-5 text-muted-foreground" />
      </div>
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {fileExtLabel(filename)}
      </span>
    </div>
  );
}

export default function PdfPreview({ url, filename, mode }) {
  const [numPages, setNumPages] = React.useState(null);
  const [pageNumber, setPageNumber] = React.useState(1);
  const [errored, setErrored] = React.useState(false);

  if (mode === "modal") {
    if (errored) {
      return (
        <div className="flex h-full min-h-[40vh] w-full flex-col items-center justify-center gap-3 text-center">
          <div className="flex size-16 items-center justify-center rounded-lg border border-border bg-muted/40">
            <FileText className="size-8 text-muted-foreground" />
          </div>
          <p className="text-[13px] text-muted-foreground">
            Couldn&apos;t preview PDF — try downloading
          </p>
        </div>
      );
    }
    return (
      <div className="flex h-full w-full flex-col items-center gap-3">
        <div className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <span
            className="min-w-0 truncate text-[12px] text-muted-foreground"
            title={filename}
          >
            {filename}
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              disabled={pageNumber <= 1}
              className="inline-flex size-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-[12px] tabular-nums text-muted-foreground">
              Page {pageNumber}
              {numPages ? ` of ${numPages}` : ""}
            </span>
            <button
              type="button"
              onClick={() =>
                setPageNumber((p) => (numPages ? Math.min(numPages, p + 1) : p))
              }
              disabled={!numPages || pageNumber >= numPages}
              className="inline-flex size-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
        <div className="flex max-h-[70vh] w-full justify-center overflow-auto rounded-lg border border-border bg-muted/20 p-4">
          <Document
            file={url}
            onLoadSuccess={({ numPages: n }) => setNumPages(n)}
            onLoadError={() => setErrored(true)}
            loading={
              <div className="flex min-h-[40vh] items-center justify-center">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            }
            error={null}
          >
            <Page
              pageNumber={pageNumber}
              width={720}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>
        </div>
      </div>
    );
  }

  if (errored) {
    return <InlinePlaceholder filename={filename} />;
  }
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex h-16 w-12 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/40">
        <Document
          file={url}
          onLoadError={() => setErrored(true)}
          loading={<FileText className="size-5 text-muted-foreground" />}
          error={<FileText className="size-5 text-muted-foreground" />}
        >
          <Page
            pageNumber={1}
            width={48}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>
      </div>
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {fileExtLabel(filename)}
      </span>
    </div>
  );
}
