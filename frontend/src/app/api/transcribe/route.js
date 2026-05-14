import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "edge";

export async function POST(req) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Transcription service is not configured." },
      { status: 503 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("audio");
    const language = formData.get("language") || "auto";

    if (!file) {
      return NextResponse.json({ error: "No audio file uploaded" }, { status: 400 });
    }

    const blob = new Blob([await file.arrayBuffer()], {
      type: file.type || "audio/webm",
    });

    const openai = new OpenAI({ apiKey });

    const transcriptionOptions = {
      file: new File([blob], file.name || "recording.webm", { type: blob.type }),
      model: "whisper-1",
    };
    if (language && language !== "auto") {
      transcriptionOptions.language = language;
    }

    const transcription = await openai.audio.transcriptions.create(transcriptionOptions);

    return NextResponse.json({
      text: transcription.text,
      language: transcription.language || language,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
