"use client";

/**
 * useQuickConvert — the one hook that powers the deterministic Quick
 * Convert UI in BOTH places it appears:
 *   1. /dashboard/quick      — authed (or anon, same surface)
 *   2. /convert/<recipe>     — public SEO pages, always anon-first
 *
 * The hook auto-detects auth state and routes through the correct path:
 *   • Authed:   Convex mutations (prompts.submit, prompts.get) directly
 *   • Anon:     Next.js /api/anon-convert + the public anon Convex query
 *
 * Why centralise it: the upload XHR, polling, error-to-modal translation,
 * and quota detection all have to match between surfaces — and they're
 * exactly the place subtle bugs live (one path silently dropping the
 * progress event, another path missing the quota-exhausted code, etc.).
 * One source of truth. Both pages stay thin.
 *
 * The hook does NOT render anything. UI lives in the caller. It exposes:
 *   • state             ("idle" | "uploading" | "submitting" | "running" | "done" | "failed")
 *   • files             — uploaded file metadata
 *   • job               — Convex prompt row (sanitized) when running/done/failed
 *   • uploadFiles(list) — handle a FileList from drop / picker
 *   • removeFile(idx)
 *   • submit(targetSize)
 *   • reset()
 *   • upgradePrompt     — { variant, fileSizeMb?, capMb? } | null  (component listens, opens modal)
 *   • dismissUpgrade()
 */

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { api } from "../../convex/_generated/api";
import { extOf } from "../../convex/quickConvertCommands";

const ANON_FILE_SIZE_CAP_MB = 25; // mirror convex/anonQuota.ts

function composePrompt(entry, targetSize) {
  if (entry.kind === "compress") {
    const s = (targetSize || "").trim();
    return s
      ? `Compress this ${entry.category} file to under ${s}.`
      : `Compress this ${entry.category} file as much as possible.`;
  }
  return entry.label;
}

export function useQuickConvert(entry) {
  const { isAuthenticated } = useAuth();

  // Authed Convex bindings (always declared — useMutation/useQuery are
  // hooks; we just skip the call when not authed).
  const generateUploadUrlAuthed = useMutation(api.prompts.generateUploadUrl);
  const submitAuthed = useMutation(api.prompts.submit);

  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [promptId, setPromptId] = useState(null);
  const [upgradePrompt, setUpgradePrompt] = useState(null);
  // For anon flows: how many free conversions are left AFTER the most
  // recent submit. Drives the post-success upsell copy.
  const [anonRemaining, setAnonRemaining] = useState(null);

  // Two queries — only one is live at a time. The Convex react bindings
  // are happy to subscribe to one and skip the other.
  const authedJob = useQuery(
    api.prompts.get,
    isAuthenticated && promptId ? { id: promptId } : "skip"
  );
  const anonJob = useQuery(
    api.prompts.getAnonymous,
    !isAuthenticated && promptId ? { id: promptId } : "skip"
  );
  const job = isAuthenticated ? authedJob : anonJob;

  /* ── Uploads ──────────────────────────────────────────────────── */

  const uploadFiles = useCallback(
    async (fileList) => {
      if (!entry) return;
      const incoming = Array.from(fileList || []);
      if (incoming.length === 0) return;

      // Extension guard.
      const bad = incoming.find(
        (f) => !entry.fromExts.includes(extOf(f.name))
      );
      if (bad) {
        toast.error(
          `${bad.name} isn't a supported input for ${entry.label}.`,
          { description: `Accepted: ${entry.fromExts.join(", ")}` }
        );
        return;
      }
      if (!entry.multiInput && (incoming.length > 1 || files.length > 0)) {
        toast.error("This conversion takes one file at a time.");
        return;
      }

      // Anon-only file-size precheck — bigger files hit the upgrade
      // modal BEFORE wasting the upload bandwidth. The server re-checks
      // for safety; this is just UX.
      if (!isAuthenticated) {
        const tooBig = incoming.find(
          (f) => f.size > ANON_FILE_SIZE_CAP_MB * 1024 * 1024
        );
        if (tooBig) {
          setUpgradePrompt({
            variant: "file-too-big",
            fileSizeMb: tooBig.size / (1024 * 1024),
            capMb: ANON_FILE_SIZE_CAP_MB,
          });
          return;
        }
      }

      setUploading(true);
      setUploadProgress(0);
      try {
        const uploaded = [];
        let i = 0;
        for (const file of incoming) {
          // Route to the right upload-URL source.
          const uploadUrl = await getUploadUrl(isAuthenticated, generateUploadUrlAuthed);
          const { storageId } = await postFile(file, uploadUrl, (overall) => {
            const local = (overall / 100) * (1 / incoming.length);
            setUploadProgress(
              Math.max(2, Math.min(99, (i / incoming.length + local) * 100))
            );
          });
          uploaded.push({ storageId, filename: file.name, size: file.size });
          i += 1;
        }
        setUploadProgress(100);
        setFiles((prev) =>
          entry.multiInput ? [...prev, ...uploaded] : uploaded
        );
      } catch (err) {
        toast.error("Upload failed", { description: err?.message });
      } finally {
        setUploading(false);
      }
    },
    [entry, files.length, isAuthenticated, generateUploadUrlAuthed]
  );

  const removeFile = useCallback((idx) => {
    setFiles((prev) => prev.filter((_, j) => j !== idx));
  }, []);

  /* ── Submit ───────────────────────────────────────────────────── */

  const submit = useCallback(
    async (targetSize) => {
      if (!entry || files.length === 0 || submitting) return;
      setSubmitting(true);
      try {
        if (isAuthenticated) {
          // Authed: direct Convex mutation. The standard quick-convert
          // path — quota lives in lib/plans.js for authed users.
          const res = await submitAuthed({
            prompt: composePrompt(entry, targetSize),
            inputStorageIds: files.map((f) => f.storageId),
            inputFilenames: files.map((f) => f.filename),
            quickConvertId: entry.id,
          });
          setPromptId(res.promptId);
        } else {
          // Anon: through the bridge-secret Next route. The route
          // hashes IP server-side and forwards to submitAnonymous.
          const totalBytes = files.reduce((s, f) => s + (f.size || 0), 0);
          const resp = await fetch("/api/anon-convert", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              quickConvertId: entry.id,
              inputStorageIds: files.map((f) => f.storageId),
              inputFilenames: files.map((f) => f.filename),
              totalBytes,
            }),
          });
          const data = await resp.json().catch(() => ({}));
          if (!resp.ok) {
            // Quota / size errors get translated into the upgrade modal,
            // not a toast. The error.code tokens are stable contract.
            const code = data?.error?.code;
            const msg = data?.error?.message || "Couldn't start the conversion.";
            if (code === "daily_limit" || code === "daily_bytes") {
              setUpgradePrompt({ variant: "quota-exhausted" });
              return;
            }
            if (code === "file_too_large") {
              setUpgradePrompt({
                variant: "file-too-big",
                fileSizeMb: totalBytes / (1024 * 1024),
                capMb: ANON_FILE_SIZE_CAP_MB,
              });
              return;
            }
            // Anything else — surface as a toast.
            toast.error("Couldn't start the conversion", { description: msg });
            return;
          }
          setPromptId(data.id);
          if (typeof data.remainingAfter === "number") {
            setAnonRemaining(data.remainingAfter);
          }
        }
      } catch (err) {
        toast.error("Couldn't start the conversion", {
          description: err?.message,
        });
      } finally {
        setSubmitting(false);
      }
    },
    [entry, files, submitting, isAuthenticated, submitAuthed]
  );

  const reset = useCallback(() => {
    setFiles([]);
    setPromptId(null);
    setUploadProgress(0);
  }, []);

  const dismissUpgrade = useCallback(() => setUpgradePrompt(null), []);

  /* ── Derived ──────────────────────────────────────────────────── */

  const state = useMemo(() => {
    if (uploading) return "uploading";
    if (submitting) return "submitting";
    if (promptId) {
      if (job?.status === "completed") return "done";
      if (job?.status === "failed") return "failed";
      return "running";
    }
    return "idle";
  }, [uploading, submitting, promptId, job]);

  return {
    state,
    files,
    uploadProgress,
    job,
    upgradePrompt,
    uploadFiles,
    removeFile,
    submit,
    reset,
    dismissUpgrade,
    isAuthenticated,
    anonRemaining,
    anonLimit: 3,
  };
}

/* ──────────────────────────────────────────────────────────────── *
 *  Upload-URL + multipart helpers
 * ──────────────────────────────────────────────────────────────── */

async function getUploadUrl(isAuthed, generateAuthed) {
  if (isAuthed) return generateAuthed();
  const resp = await fetch("/api/anon-convert/upload-url", { method: "POST" });
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data?.error?.message || `Upload URL failed (${resp.status})`);
  }
  const { uploadUrl } = await resp.json();
  return uploadUrl;
}

function postFile(file, uploadUrl, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl);
    xhr.setRequestHeader(
      "Content-Type",
      file.type || "application/octet-stream"
    );
    xhr.upload.onprogress = (ev) => {
      if (!ev.lengthComputable) return;
      onProgress((ev.loaded / ev.total) * 100);
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
}
