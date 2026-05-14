import { NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";

// Node runtime: reliable multipart + Buffer handling for SDK uploads.
export const runtime = "nodejs";
export const maxDuration = 60;

// Groq hosts an OpenAI-compatible Whisper endpoint at /openai/v1.
// Reusing the `openai` SDK with the Groq base URL avoids a second client.
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

// whisper-large-v3 is the highest-accuracy model on Groq, supports the full
// Indic language set, and accepts the `prompt`+`language` hints we use.
// `whisper-large-v3-turbo` is ~3x faster but English-only — not suitable here.
const GROQ_MODEL = "whisper-large-v3";

// Whisper accepts ISO-639-1 language codes. "auto" falls through to detection.
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

// Script hints sent as Whisper's `prompt` parameter. This biases the decoder
// toward the right script (Devanagari, Tamil, etc.) for short utterances that
// the model would otherwise transliterate into Latin.
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
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Transcription is not configured. Set GROQ_API_KEY on the server.",
      },
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

  // Trust the upload's reported MIME; fall back to filename extension. The
  // browser may send mp4 (Safari), webm/opus (Chrome/Firefox), or ogg.
  const contentType = file.type || guessTypeFromName(file.name) || "audio/webm";
  const filename = ensureExtension(file.name || "recording", contentType);

  // Whisper rejects effectively-empty audio with a confusing 400. Catch early.
  if (typeof file.size === "number" && file.size < 1024) {
    return NextResponse.json(
      { error: "Recording is too short. Try again." },
      { status: 400 }
    );
  }

  const client = new OpenAI({
    apiKey,
    baseURL: GROQ_BASE_URL,
  });

  // `toFile` accepts a Web File / Blob / Buffer / stream and produces the
  // multipart-friendly shape the SDK needs without bespoke wrapping. This
  // sidesteps the "Buffer is not a BlobPart" friction in older Node versions.
  let uploadFile;
  try {
    uploadFile = await toFile(file, filename, { type: contentType });
  } catch (err) {
    return NextResponse.json(
      { error: `Couldn't read audio: ${err.message}` },
      { status: 400 }
    );
  }

  const usingLanguage =
    typeof language === "string" && SUPPORTED_LANGUAGES.has(language)
      ? language
      : null;

  const params = {
    file: uploadFile,
    model: GROQ_MODEL,
    response_format: "verbose_json",
    temperature: 0,
  };

  if (usingLanguage) {
    params.language = usingLanguage;
    const prompt = SCRIPT_PROMPTS[usingLanguage];
    if (prompt) params.prompt = prompt;
  }

  try {
    const transcription = await client.audio.transcriptions.create(params);
    const text = (transcription.text || "").trim();

    return NextResponse.json({
      text,
      language: transcription.language || usingLanguage || "auto",
      duration: transcription.duration,
    });
  } catch (err) {
    // Surface the upstream message so toasts give actionable info.
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
