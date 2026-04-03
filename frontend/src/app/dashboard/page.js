"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { FileUpload } from "@/components/file-upload";
import { AIResponse } from "@/components/ai-response";
import { uploadFiles, listPrompts } from "@/services/api";
import { useStatusPolling } from "@/hooks/use-status-polling";
import { FileText, Upload, History, Sparkles, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

// Configuration
const MAX_RECENT_PROMPTS = 10; // Maximum number of recent prompts to display

// Status constants
const PROCESSING_STATUS = {
  COMPLETED: "completed",
  PENDING: "pending",
  FAILED: "failed",
};

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [recentPrompts, setRecentPrompts] = useState([]);
  const [error, setError] = useState(null);
  const router = useRouter();

  // Fetch session on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/session");
        const data = await res.json();

        if (!data.session || !data.user) {
          router.push("/");
          return;
        }

        setUser(data.user);
        // Load recent prompts
        loadRecentPrompts(data.user.id);
      } catch (err) {
        console.error("Session check failed:", err);
        router.push("/");
      } finally {
        setIsLoading(false);
      }
    }

    checkSession();
  }, [router]);

  const loadRecentPrompts = async (userId) => {
    try {
      const response = await listPrompts(userId);
      if (response.status === "ok" && response.items) {
        setRecentPrompts(response.items.slice(0, MAX_RECENT_PROMPTS));
      }
    } catch (err) {
      console.error("Failed to load prompts:", err);
    }
  };

  const handleUpload = async (files, prompt) => {
    if (!user) return;

    setIsUploading(true);
    setError(null);
    setUploadResult(null);

    try {
      const result = await uploadFiles(files, prompt, user.id);

      if (result.status === "ok") {
        setUploadResult(result);
        // Reload recent prompts
        await loadRecentPrompts(user.id);
      }
    } catch (err) {
      console.error("Upload failed:", err);
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setUploadResult(null);
    setError(null);
  };

  const handleNewChat = () => {
    // Reset the current upload result to start a new conversation
    setUploadResult(null);
    setError(null);
    // Scroll to top to focus on file upload
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleChatClick = (item) => {
    // Load the chat/conversation by setting it as the current upload result
    // The AIResponse component expects specific structure
    const chatResult = {
      id: item.id,
      ai_response: {
        linux_command: item.ai_command,
        command_template: item.command_template || item.ai_command,
        input_files: [],
        output_files: [],
        description: item.ai_response || "Previous conversation",
        ai_processing_status: item.ai_processing_status || PROCESSING_STATUS.COMPLETED
      },
      prompt: item.prompt,
      files: [{
        id: item.id,
        original_filename: item.original_filename,
        stored_filename: item.stored_filename
      }]
    };
    
    setUploadResult(chatResult);
    setError(null);
    
    // Scroll to view the response
    window.scrollTo({ top: 200, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            Welcome back, {user.name}!
          </h1>
          <p className="text-muted-foreground mt-2">
            Upload files and let AI generate the perfect command for your media processing needs
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left Column: Upload */}
          <div className="space-y-6">
            <div className="rounded-lg border bg-card p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="rounded-full bg-primary/10 p-3">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Upload & Process</h2>
                  <p className="text-sm text-muted-foreground">
                    Upload files and describe what you need
                  </p>
                </div>
              </div>

              <FileUpload onUpload={handleUpload} isUploading={isUploading} />

              {error && (
                <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
                  <p className="font-medium">Error:</p>
                  <p className="text-sm">{error}</p>
                </div>
              )}
            </div>

            {/* Recent Files */}
            {recentPrompts.length > 0 && (
              <div className="rounded-lg border bg-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <History className="h-5 w-5 text-blue-500" />
                    <h3 className="font-semibold">Chat History</h3>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleNewChat}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    New Chat
                  </Button>
                </div>
                <div className="space-y-2">
                  {recentPrompts.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg bg-muted/50 border cursor-pointer hover:bg-muted hover:border-primary/50 transition-all"
                      onClick={() => handleChatClick(item)}
                    >
                      <p className="text-sm font-medium truncate">{item.prompt}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.original_filename} • {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: AI Response */}
          <div className="space-y-6">
            {uploadResult ? (
              <div className="rounded-lg border bg-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-green-500/10 p-3">
                      <Sparkles className="h-6 w-6 text-green-500" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">AI Generated Command</h2>
                      <p className="text-sm text-muted-foreground">
                        Ready to execute
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    New Upload
                  </Button>
                </div>

                <AIResponse 
                  result={uploadResult} 
                  status={uploadResult.ai_response?.ai_processing_status || PROCESSING_STATUS.COMPLETED} 
                />
              </div>
            ) : (
              <div className="rounded-lg border bg-card p-12 flex flex-col items-center justify-center text-center">
                <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                  No Results Yet
                </h3>
                <p className="text-sm text-muted-foreground">
                  Upload files and provide a prompt to get started
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-6 text-center">
            <div className="text-3xl font-bold text-primary mb-2">
              {recentPrompts.length}
            </div>
            <p className="text-sm text-muted-foreground">Total Conversions</p>
          </div>

          <div className="rounded-lg border bg-card p-6 text-center">
            <div className="text-3xl font-bold text-green-500 mb-2">
              {recentPrompts.filter(p => p.ai_processing_status === PROCESSING_STATUS.COMPLETED).length}
            </div>
            <p className="text-sm text-muted-foreground">Successful</p>
          </div>

          <div className="rounded-lg border bg-card p-6 text-center">
            <div className="text-3xl font-bold text-blue-500 mb-2">
              {uploadResult ? 1 : 0}
            </div>
            <p className="text-sm text-muted-foreground">Active Sessions</p>
          </div>
        </div>
      </main>
    </div>
  );
}