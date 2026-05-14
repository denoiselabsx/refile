import { NextResponse } from "next/server";
import OpenAI from "openai";

// Node runtime: more reliable multipart handling and File polyfill behavior
// for OpenAI SDK uploads than the edge runtime, especially for non-English audio.
export const runtime = "nodejs";
export const maxDuration = 60;

// Whisper / gpt-4o-transcribe accept ISO-639-1 language codes. Anything else
// makes the model fall back to auto-detect, which is what we want for "auto".
const SUPPORTED_LANGUAGES = new Set([
  "en",
  "hi",
  "ta",
  "te",
  "kn",
  "ml",
  "mr",
  "bn",
  "gu",
  "pa",
  "ur",
]);

// Script hints. These get sent as Whisper's `prompt` parameter, which biases
// the decoder toward producing the right script (Devanagari vs Latin, etc.)
// for short utterances where the model would otherwise transliterate.
// The phrases themselves are throwaway context — only the script matters.
const SCRIPT_PROMPTS = {
  hi: "यह हिन्दी में बोला गया है। कृपया देवनागरी लिपि में लिखें।",
  ta: "இது தமிழில் பேசப்பட்டது. தமிழ் எழுத்துகளில் எழுதவும்.",
  te: "ఇది తెలుగులో మాట్లాడబడింది. తెలుగు లిపిలో రాయండి.",
  kn: "ಇದು ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಲಾಗಿದೆ. ಕನ್ನಡ ಲಿಪಿಯಲ್ಲಿ ಬರೆಯಿರಿ.",
  ml: "ഇത് മലയാളത്തിൽ സംസാരിച്ചതാണ്. മലയാള ലിപിയിൽ എഴുതുക.",
  mr: "हे मराठीत बोलले आहे. कृपया देवनागरी लिपीत लिहा.",
  bn: "এটি বাংলায় বলা হয়েছে। বাংলা লিপিতে লিখুন।",
  gu: "આ ગુજરાતીમાં બોલાયું છે. ગુજરાતી લિપિમાં લખો.",
  pa: "ਇਹ ਪੰਜਾਬੀ ਵਿੱਚ ਬੋਲਿਆ ਗਿਆ ਹੈ। ਗੁਰਮੁਖੀ ਲਿਪੀ ਵਿੱਚ ਲਿਖੋ।",
  ur: "یہ اردو میں بولا گیا ہے۔ براہ کرم اردو رسم الخط میں لکھیں۔",
  en: "",
};

export async function POST(req) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Transcription service is not configured." },
      { status: 503 }
    );
  }

  let file;
  let language;
  try {
    const formData = await req.formData();
    file = formData.get("audio");
    language = formData.get("language") || "auto";
  } catch (err) {
    return NextResponse.json(
      { error: `Could not parse upload: ${err.message}` },
      { status: 400 }
    );
  }

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No audio file uploaded" }, { status: 400 });
  }

  // The browser may send mp4 (Safari), webm/opus (Chrome/Firefox), or ogg.
  // Trust the upload's reported type; fall back to the filename extension.
  const contentType = file.type || guessTypeFromName(file.name) || "audio/webm";
  const filename = ensureExtension(file.name || "recording", contentType);

  // Whisper rejects empty files with a confusing error. Catch it early.
  if (typeof file.size === "number" && file.size < 1024) {
    return NextResponse.json(
      { error: "Recording is too short. Try again." },
      { status: 400 }
    );
  }

  const openai = new OpenAI({ apiKey });

  // Hand the SDK a real File built from the upload's bytes. Re-wrapping the
  // Blob avoids "unsupported file type" issues seen on some runtimes when
  // the original FormData entry is passed through verbatim.
  const buffer = Buffer.from(await file.arrayBuffer());
  const uploadFile = new File([buffer], filename, { type: contentType });

  const usingLanguage =
    typeof language === "string" && SUPPORTED_LANGUAGES.has(language)
      ? language
      : null;

  // Whisper-1 stays the default. It supports the full Indic set, accepts a
  // language hint, and supports the prompt-as-script-hint trick. Newer
  // gpt-4o transcription models exist but at higher cost and with stricter
  // file-size limits — prefer whisper for now.
  const params = {
    file: uploadFile,
    model: "whisper-1",
    response_format: "verbose_json",
    temperature: 0,
  };

  if (usingLanguage) {
    params.language = usingLanguage;
    const prompt = SCRIPT_PROMPTS[usingLanguage];
    if (prompt) params.prompt = prompt;
  }

  try {
    const transcription = await openai.audio.transcriptions.create(params);
    const text = (transcription.text || "").trim();

    return NextResponse.json({
      text,
      language: transcription.language || usingLanguage || "auto",
      duration: transcription.duration,
    });
  } catch (err) {
    // OpenAI SDK throws APIError with status + a typed `message`. Surface
    // the cleaned-up message rather than the raw stack to the client.
    const status = err?.status ?? err?.response?.status ?? 500;
    const message =
      err?.error?.message ||
      err?.response?.data?.error?.message ||
      err?.message ||
      "Transcription failed";
    return NextResponse.json({ error: message }, { status });
  }
}

function guessTypeFromName(name) {
  if (!name) return null;
  const ext = name.toLowerCase().split(".").pop();
  switch (ext) {
    case "webm":
      return "audio/webm";
    case "ogg":
    case "oga":
      return "audio/ogg";
    case "mp3":
      return "audio/mpeg";
    case "m4a":
    case "mp4":
      return "audio/mp4";
    case "wav":
      return "audio/wav";
    default:
      return null;
  }
}

function ensureExtension(name, contentType) {
  if (/\.[a-z0-9]+$/i.test(name)) return name;
  const map = {
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/wav": "wav",
  };
  return `${name}.${map[contentType] || "webm"}`;
}
