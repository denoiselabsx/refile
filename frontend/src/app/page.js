"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Paperclip, ArrowRight, Upload, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { FileUpload } from "@/components/file-upload";
import { AIResponse } from "@/components/ai-response";
import { useAuth } from "@/contexts/auth-context";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [showUpload, setShowUpload] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Get current user session
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch('/api/session');
        if (response.ok) {
          const { session, user } = await response.json();
          if (session && user) {
            setCurrentUser(user);
            // Store user ID for components that need it
            localStorage.setItem('user_id', user.id);
          } else {
            // Guest user - create a temporary ID
            const guestId = `guest_${Date.now()}`;
            localStorage.setItem('user_id', guestId);
            setCurrentUser({ id: guestId, name: 'Guest User' });
          }
        } else {
          // Fallback to guest
          const guestId = `guest_${Date.now()}`;
          localStorage.setItem('user_id', guestId);
          setCurrentUser({ id: guestId, name: 'Guest User' });
        }
      } catch (error) {
        console.error('Failed to fetch session:', error);
        // Fallback to guest
        const guestId = `guest_${Date.now()}`;
        localStorage.setItem('user_id', guestId);
        setCurrentUser({ id: guestId, name: 'Guest User' });
      }
    };

    fetchSession();
  }, []);
  
  // Debug logging
  console.log("🔐 Auth Status:", isAuthenticated);
  console.log("👤 Current User:", currentUser);

  const handleQuickUpload = async (files, prompt) => {
    if (!currentUser) {
      setError("Please wait for authentication to complete");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const API_URL = 'http://localhost:8000';
      const userId = currentUser.id;
      
      console.log("📤 Step 1: Uploading files...");
      
      // Step 1: Upload files
      const uploadFormData = new FormData();
      files.forEach((file) => {
        uploadFormData.append('files', file);
      });

      const uploadResponse = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'x-user-id': userId,
        },
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: ${errorText}`);
      }

      const uploadResult = await uploadResponse.json();
      console.log("✅ Upload successful:", uploadResult);
      
      // Step 2: Process with AI
      console.log("🤖 Step 2: Processing with AI...");
      
      const fileNames = uploadResult.files.map(f => f.stored_filename);
      
      const processFormData = new FormData();
      processFormData.append('prompt', prompt);
      processFormData.append('uploaded_files', JSON.stringify(fileNames));

      const processResponse = await fetch(`${API_URL}/api/process`, {
        method: 'POST',
        headers: {
          'x-user-id': userId,
        },
        body: processFormData,
      });

      if (!processResponse.ok) {
        const errorText = await processResponse.text();
        throw new Error(`AI Processing failed: ${errorText}`);
      }

      const processResult = await processResponse.json();
      console.log("✅ AI Response received:", processResult);

      // Display the AI response
      setResult({
        status: "ok",
        files: uploadResult.files,
        ai_response: processResult.ai_response
      });

    } catch (err) {
      console.error("❌ Processing error:", err);
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const features = [
    "File Conversion",
    "Smart Extract",
    "AI Summary",
    "APIs",
    "Retail Data",
    "Mobility Reports",
  ];

  return (
    <div 
      className="relative min-h-screen transition-colors duration-300"
      style={{ backgroundColor: 'var(--background)' }}
    >
      {/* Subtle gradient glow effect */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(128,128,128,0.05),transparent_50%)]" />
      
      {/* Conditionally render Sidebar or Navbar */}
      {isAuthenticated ? <Sidebar /> : <Navbar />}

      <main 
        className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-16 transition-all duration-300"
        style={{
          marginLeft: isAuthenticated ? '64px' : '0'
        }}
      >
        {/* Center Content */}
        <div className="w-full max-w-4xl space-y-8">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-12 flex items-center justify-center gap-3"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: 'var(--foreground)' }}
            >
              <path d="M12.5 22H18a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v9.5" />
              <path d="M14 2v4a2 2 0 0 0 2 2h4" />
              <path d="M13.378 15.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z" />
            </svg>
            <h1 className="text-5xl font-bold md:text-6xl" style={{ color: 'var(--foreground)' }}>ReFile</h1>
          </motion.div>

          {/* Search Bar or Upload Section */}
          {!showUpload ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="relative"
            >
              <div 
                className="group relative flex items-center rounded-full p-3 shadow-2xl backdrop-blur-sm transition-all hover:shadow-lg"
                style={{
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--card)',
                }}
              >
                {/* File Upload Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-1 h-10 w-10 hover:bg-transparent"
                  style={{ color: 'var(--muted-foreground)' }}
                  aria-label="Upload files"
                  onClick={() => setShowUpload(true)}
                >
                  <Upload className="h-5 w-5" />
                </Button>

                {/* Input */}
                <Input
                  type="text"
                  placeholder="What do you want to convert? Click upload to get started!"
                  className="h-12 flex-1 border-0 bg-transparent px-4 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
                  style={{ 
                    color: 'var(--foreground)',
                  }}
                  onFocus={() => setShowUpload(true)}
                />

                {/* Submit Button */}
                <Button
                  size="icon"
                  className="h-12 w-12 rounded-full"
                  style={{
                    backgroundColor: 'var(--primary)',
                    color: 'var(--primary-foreground)'
                  }}
                  onClick={() => setShowUpload(true)}
                >
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </motion.div>
          ) : (
            /* Upload Interface */
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-2xl mx-auto"
            >
              <div className="rounded-xl border bg-card shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-3">
                      <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">AI File Processing</h2>
                      <p className="text-sm text-muted-foreground">
                        Upload files and get AI-generated commands
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setShowUpload(false);
                      setResult(null);
                      setError(null);
                    }}
                  >
                    Back to Search
                  </Button>
                </div>

                <FileUpload onUpload={handleQuickUpload} isUploading={isProcessing} />

                {error && (
                  <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
                    <p className="font-medium">Error:</p>
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                {result && (
                  <div className="mt-6">
                    <AIResponse result={result} status="completed" />
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Bottom Text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-12 text-center text-sm"
            style={{ color: 'var(--muted-foreground)' }}
          >
            By using ReFile, you agree to our{" "}
            <a href="#" className="underline transition-colors" style={{ color: 'var(--muted-foreground)' }}>
              Terms
            </a>{" "}
            and{" "}
            <a href="#" className="underline transition-colors" style={{ color: 'var(--muted-foreground)' }}>
              Privacy Policy
            </a>
            .
          </motion.p>
        </div>
      </main>
    </div>
  );
}
