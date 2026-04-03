import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = "edge"; // 👈 ensures Edge runtime

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("audio");
    const language = formData.get("language") || "auto"; // auto-detect by default

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Re-wrap into a real Blob (Edge friendly)
    const blob = new Blob([await file.arrayBuffer()], {
      type: file.type || "audio/webm",
    });

    // Build transcription options
    const transcriptionOptions = {
      file: new File([blob], file.name || "recording.webm", { type: blob.type }),
      model: "whisper-1", // Whisper-1 supports 99 languages including Indian languages
    };

    // Add language hint if specified (helps with accuracy)
    // Supported: 'hi' (Hindi), 'ta' (Tamil), 'te' (Telugu), 'en' (English), etc.
    if (language && language !== "auto") {
      transcriptionOptions.language = language;
    }

    // OpenAI accepts Blob in Edge runtime
    const transcription = await openai.audio.transcriptions.create(transcriptionOptions);

    return NextResponse.json({ 
      text: transcription.text,
      language: transcription.language || language 
    });
  } catch (err) {
    console.error("Transcription error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}