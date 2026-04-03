"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, X, FileText, Image, Video, Music, File, Mic, Send, Trash, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const getFileIcon = (fileType) => {
  if (fileType.startsWith("image/")) return <Image className="h-5 w-5" />;
  if (fileType.startsWith("video/")) return <Video className="h-5 w-5" />;
  if (fileType.startsWith("audio/")) return <Music className="h-5 w-5" />;
  if (fileType.includes("pdf") || fileType.includes("document"))
    return <FileText className="h-5 w-5" />;
  return <File className="h-5 w-5" />;
};

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

export function FileUpload({ onUpload, isUploading = false }) {
  const [files, setFiles] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  
  // Voice recording state
  const [mode, setMode] = useState('text'); // 'text' or 'voice'
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [helperText, setHelperText] = useState("Press and hold to talk");
  const [mediaStream, setMediaStream] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState("auto"); // Default to auto-detect
  
  // Refs for voice recording
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const micContainerRef = useRef(null);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    console.log("📁 Files dropped:", droppedFiles);
    setFiles((prev) => {
      const newFiles = [...prev, ...droppedFiles];
      console.log("📁 Updated files list:", newFiles);
      return newFiles;
    });
  }, []);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    console.log("📁 Files selected:", selectedFiles);
    setFiles((prev) => {
      const newFiles = [...prev, ...selectedFiles];
      console.log("📁 Updated files list:", newFiles);
      return newFiles;
    });
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Voice recording handlers
  const handleStartRecording = async () => {
    setHelperText("Slide right to send, left to cancel");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMediaStream(stream);
      setIsRecording(true);
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.start();
    } catch (error) {
      console.error("Error accessing microphone:", error);
      setHelperText("Microphone access denied.");
    }
  };

  const handleStopRecording = async (action) => {
    if (!mediaRecorderRef.current) return;

    const recorder = mediaRecorderRef.current;
    
    recorder.onstop = async () => {
      mediaStream?.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      setMediaStream(null);
      setHelperText("Press and hold to talk");
    
      if (action === "cancel" || audioChunksRef.current.length === 0) {
        audioChunksRef.current = [];
        return;
      }
    
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      audioChunksRef.current = [];
    
      try {
        setIsTranscribing(true);
        setPrompt("Transcribing...");
        
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");
        formData.append("language", selectedLanguage); // Include language preference
        const transcribeResponse = await fetch("/api/transcribe", { 
          method: "POST", 
          body: formData 
        });
        
        if (!transcribeResponse.ok) throw new Error("Transcription failed");
        const { text: transcribedText } = await transcribeResponse.json();
        
        setPrompt(transcribedText);
        
        // Auto-start processing if files are already selected
        if (files.length > 0) {
          await onUpload(files, transcribedText);
          setFiles([]);
          setPrompt("");
        }
        
      } catch (err) {
        console.error("Error in transcription:", err);
        setPrompt("Error transcribing audio. Please try again.");
      } finally {
        setIsTranscribing(false);
      }
    };
    
    recorder.stop();
  };

  const handleDragEnd = (_, info) => {
    if (!isRecording) return;
    const offset = info.offset.x;
    const threshold = 100;

    if (offset > threshold) handleStopRecording("send");
    else handleStopRecording("cancel");
  };

  const handleDrag = (_, info) => {
    if (!isRecording) return;
    const offset = info.offset.x;
    if (offset > 100) setHelperText("Release to send");
    else if (offset < -100) setHelperText("Release to cancel");
    else setHelperText("Slide right to send, left to cancel");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (files.length === 0) {
      alert("Please select at least one file");
      return;
    }

    if (!prompt.trim()) {
      alert("Please enter a prompt describing what you want to do");
      return;
    }

    await onUpload(files, prompt);

    // Reset form after successful upload
    setFiles([]);
    setPrompt("");
  };

  return (
    <div className="w-full space-y-4">
      {/* Drag and Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative rounded-lg border-2 border-dashed p-8
          transition-colors duration-200
          ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 bg-muted/20"
          }
          ${isUploading ? "pointer-events-none opacity-50" : "cursor-pointer"}
        `}
      >
        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />

        <div className="flex flex-col items-center justify-center text-center">
          <Upload
            className={`h-12 w-12 mb-4 ${
              isDragging ? "text-primary" : "text-muted-foreground"
            }`}
          />
          <h3 className="text-lg font-semibold mb-2">
            {isDragging ? "Drop files here" : "Upload Files"}
          </h3>
          <p className="text-sm text-muted-foreground mb-2">
            Drag and drop files here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            Supports images, videos, audio, PDFs, and documents
          </p>
        </div>
      </div>

      {/* Selected Files List */}
      {files.length > 0 && (
        <div className="space-y-2 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border-2 border-blue-200 dark:border-blue-800">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <span className="text-blue-600 dark:text-blue-400">✓</span>
            Selected Files ({files.length})
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
              >
                <div className="text-muted-foreground">
                  {getFileIcon(file.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  disabled={isUploading}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mode Toggle */}
      <div className="flex items-center justify-center gap-3 p-4 bg-muted/20 rounded-lg">
        <Button
          type="button"
          variant={mode === 'text' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setMode('text')}
          className="flex items-center gap-2"
        >
          <MessageSquare className="h-4 w-4" />
          Type
        </Button>
        <Button
          type="button"
          variant={mode === 'voice' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setMode('voice')}
          className="flex items-center gap-2"
        >
          <Mic className="h-4 w-4" />
          Voice
        </Button>
      </div>

      {/* Prompt Input */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="prompt" className="text-sm font-medium">
            What do you want to do with {files.length > 0 ? "these files" : "your files"}?
          </label>
          
          {mode === 'voice' ? (
            // Voice Input Slider
            <div className="w-full space-y-4">
              {/* Language Selector */}
              <div className="flex items-center gap-3">
                <label htmlFor="language-select" className="text-sm font-medium whitespace-nowrap">
                  Transcription Language:
                </label>
                <select
                  id="language-select"
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="flex-1 p-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isRecording || isTranscribing}
                >
                  <option value="auto">🌐 Auto-detect</option>
                  <option value="en">🇬🇧 English</option>
                  <option value="hi">🇮🇳 Hindi (हिन्दी)</option>
                  <option value="ta">🇮🇳 Tamil (தமிழ்)</option>
                  <option value="te">🇮🇳 Telugu (తెలుగు)</option>
                  <option value="kn">🇮🇳 Kannada (ಕನ್ನಡ)</option>
                  <option value="ml">🇮🇳 Malayalam (മലയാളം)</option>
                  <option value="mr">🇮🇳 Marathi (मराठी)</option>
                  <option value="bn">🇮🇳 Bengali (বাংলা)</option>
                  <option value="gu">🇮🇳 Gujarati (ગુજરાતી)</option>
                  <option value="pa">🇮🇳 Punjabi (ਪੰਜਾਬੀ)</option>
                  <option value="ur">🇮🇳 Urdu (اردو)</option>
                </select>
              </div>

              {/* Voice Recording UI */}
              <div className="w-full flex flex-col items-center gap-4 p-4 border rounded-lg bg-background">
              <p className="text-sm text-muted-foreground h-5">{helperText}</p>
              <div
                ref={micContainerRef}
                className="w-80 h-16 rounded-full flex items-center justify-center bg-muted relative overflow-hidden select-none"
              >
                <div className="absolute left-0 top-0 h-full w-1/2 bg-red-500/20 flex items-center justify-start pl-6 text-red-500">
                  <Trash />
                </div>
                <div className="absolute right-0 top-0 h-full w-1/2 bg-green-500/20 flex items-center justify-end pr-6 text-green-500">
                  <Send />
                </div>

                <motion.div
                  className={`w-16 h-16 rounded-full flex items-center justify-center cursor-pointer touch-none z-10 ${
                    isRecording ? 'bg-red-500' : 'bg-primary'
                  }`}
                  onPointerDown={handleStartRecording}
                  drag="x"
                  dragConstraints={micContainerRef}
                  dragSnapToOrigin
                  onDragEnd={handleDragEnd}
                  onDrag={handleDrag}
                  whileTap={{ scale: 1.1 }}
                  dragElastic={0.2}
                  disabled={isUploading || isTranscribing}
                >
                  <Mic className="text-primary-foreground" />
                </motion.div>
              </div>
              
              {/* Show transcribed text */}
              {prompt && (
                <div className="w-full p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    {isTranscribing ? "Transcribing..." : "Transcribed:"}
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    {prompt}
                  </p>
                </div>
              )}
              </div>
            </div>
          ) : (
            // Text Input
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="E.g., 'Extract audio from this video' or 'Resize these images to 800x600' or 'Merge these PDFs into one file'"
              className="w-full min-h-[100px] p-3 rounded-lg border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isUploading || isTranscribing}
            />
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isUploading || isTranscribing || files.length === 0 || !prompt.trim()}
        >
          {isUploading ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Processing...
            </>
          ) : isTranscribing ? (
            <>
              <span className="animate-spin mr-2">🎤</span>
              Transcribing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload and Process
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
