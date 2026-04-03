"use client";

import { CheckCircle2, Copy, Terminal, FileInput, FileOutput, AlertCircle, Sparkles, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

export function AIResponse({ result, status = "completed" }) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState({}); // map filename -> bool
  const [savingPreset, setSavingPreset] = useState(false);
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  if (!result) return null;

  // Handle both direct ai_response and nested structure
  const ai_response = result.ai_response || result;
  
  if (!ai_response || (!ai_response.linux_command && !ai_response.description)) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-3 text-muted-foreground">
          <AlertCircle className="h-5 w-5" />
          <p>AI is processing your request...</p>
        </div>
      </div>
    );
  }

  const { linux_command, input_files, output_files, description } = ai_response;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(linux_command || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveAsPreset = async () => {
    if (!isAuthenticated) {
      alert('Please sign in to save presets');
      return;
    }

    if (!ai_response.command_template) {
      alert('Command template is not available for this response');
      return;
    }

    // Redirect to preset creation page with pre-filled data
    const presetData = {
      command_template: ai_response.command_template,
      description: ai_response.description || '',
      input_files: ai_response.input_files || [],
      output_files: ai_response.output_files || []
    };

    // Store in sessionStorage to pass to create page
    sessionStorage.setItem('preset_draft', JSON.stringify(presetData));
    router.push('/presets/create');
  };

  const handleDownload = async (file) => {
    // file can be a string (legacy) or an object with stored_filename + original_filename
    let storedFilename = null;
    let originalFilename = null;

    if (typeof file === 'string') {
      storedFilename = file;
      originalFilename = file;
    } else if (file && typeof file === 'object') {
      // prefer stored_filename (UUID name) for download path
      storedFilename = file.stored_filename || file.storedFilename || file.storedName || file.filename || file.name;
      originalFilename = file.original_filename || file.originalFilename || file.filename || file.name || storedFilename;
    }

    if (!storedFilename) {
      // fallback label
      storedFilename = originalFilename || 'file';
    }

    // Get user ID from localStorage (set by page.js session check)
    const userId = localStorage.getItem('user_id');
    if (!userId) {
      alert('User not authenticated. Please refresh the page.');
      return;
    }

    const downloadUrl = `${API_BASE}/files/${encodeURIComponent(userId)}/${encodeURIComponent(storedFilename)}`;

    try {
      setDownloading((d) => ({ ...d, [storedFilename]: true }));
      const res = await fetch(downloadUrl, {
        headers: {
          'x-user-id': userId,
        },
      });

      if (!res.ok) throw new Error(`Download failed (${res.status})`);

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = originalFilename || storedFilename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error', err);
      alert('Failed to download file: ' + (err.message || err));
    } finally {
      setDownloading((d) => ({ ...d, [storedFilename]: false }));
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Badge */}
      <div className="flex items-center gap-2">
        {status === "completed" && (
          <>
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <span className="text-sm font-medium text-green-500">AI Processing Complete</span>
          </>
        )}
        {status === "processing" && (
          <>
            <span className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
            <span className="text-sm font-medium text-primary">Processing...</span>
          </>
        )}
        {status === "failed" && (
          <>
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span className="text-sm font-medium text-red-500">Processing Failed</span>
          </>
        )}
      </div>

      {/* Description */}
      {description && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold">What this does:</h3>
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      )}

      {/* Save as Preset Button */}
      {linux_command && ai_response.command_template && (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="default"
            onClick={handleSaveAsPreset}
            disabled={savingPreset || !isAuthenticated}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {savingPreset ? "Saving..." : "Save as Preset"}
          </Button>
        </div>
      )}

      {/* Linux Command */}
      {linux_command && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Command to Execute:</h3>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={copyToClipboard}
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>

          <div className="relative">
            <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm font-mono">
              <code>{linux_command}</code>
            </pre>
          </div>

          <div className="text-xs text-muted-foreground">
            Copy this command and run it in your terminal
          </div>
        </div>
      )}

      {/* Input and Output Files */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Input Files */}
        {input_files && input_files.length > 0 && (
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileInput className="h-5 w-5 text-blue-500" />
              <h3 className="font-semibold">Input Files:</h3>
            </div>
            <div className="space-y-2">
              {input_files.map((file, index) => (
                <div
                  key={index}
                  className="text-sm p-2 rounded bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800"
                >
                  📄 {file}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Output Files */}
        {output_files && output_files.length > 0 && (
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileOutput className="h-5 w-5 text-green-500" />
              <h3 className="font-semibold">Output Files:</h3>
            </div>
            <div className="space-y-2">
              {output_files.map((file, index) => {
                const isString = typeof file === 'string';
                const storedFilename = isString ? file : (file.stored_filename || file.storedFilename || file.storedName || file.filename || file.name);
                const originalFilename = isString ? file : (file.original_filename || file.originalFilename || file.filename || file.name || storedFilename);

                return (
                  <div
                    key={index}
                    className="text-sm p-2 rounded bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 flex items-center justify-between"
                  >
                    <span className="truncate">📁 {originalFilename}</span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(file)}
                        className="gap-1 h-7 px-2 text-xs"
                        disabled={Boolean(downloading[storedFilename])}
                      >
                        {downloading[storedFilename] ? 'Downloading...' : '📥 Download'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}