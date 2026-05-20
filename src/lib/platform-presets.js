/**
 * Platform-aware presets — "Convert for WhatsApp / Instagram / Email / ..."
 *
 * Architectural choice: these are PROMPT-MUTATION presets, not deterministic
 * templates. Tapping a preset pre-fills the composer with a natural-language
 * prompt that names the constraints (size, codec, aspect ratio); the LLM
 * still picks the tool and command. Reasons:
 *
 *   - The LLM benefits from the corrector + learned-lessons pipeline that
 *     already exists; bypassing it would freeze these recipes in time.
 *   - "Generalize, don't enumerate" (memory): a single natural-language
 *     intent covers more edge cases than a hardcoded codec/bitrate matrix.
 *   - Tool/command names never appear in user-facing UI (memory:
 *     hide-tool-internals). The `description` is what we show; the
 *     `prompt` is what the model sees.
 *
 * If a constraint genuinely requires deterministic enforcement (e.g.
 * WhatsApp's 16 MB hard limit), the safer enforcement happens in the
 * sandbox worker as a post-check + re-encode, not in the prompt.
 */

export const PLATFORM_PRESETS = [
  {
    id: "whatsapp-video",
    label: "WhatsApp",
    description:
      "Compresses video to under 16 MB at 720p with H.264 video and AAC audio so it sends without WhatsApp refusing.",
    // Natural-language prompt — what the LLM sees. Mentions concrete
    // constraints so the model has something to plan against.
    prompt:
      "Compress this video for WhatsApp sharing: H.264 video, AAC audio, total file under 16 MB, 720p maximum, trim to 3 minutes if longer.",
    // Which file kinds this preset makes sense for. The UI hides presets
    // that don't match the staged files (e.g. no point showing "WhatsApp
    // video" if the only file is a PDF).
    accepts: ["video"],
  },
  {
    id: "whatsapp-status",
    label: "WhatsApp Status",
    description:
      "Vertical 9:16 video under 16 MB and 30 seconds — the exact shape WhatsApp Status accepts.",
    prompt:
      "Prepare this video for WhatsApp Status: vertical 9:16 aspect ratio (crop if landscape), maximum 30 seconds, H.264 video, AAC audio, total under 16 MB.",
    accepts: ["video"],
  },
  {
    id: "instagram-reel",
    label: "Instagram Reel",
    description:
      "9:16 vertical, up to 60 seconds, encoded the way Instagram expects so it uploads without re-compression.",
    prompt:
      "Prepare this video for Instagram Reels: 9:16 vertical aspect ratio (crop or pad as needed), maximum 60 seconds, H.264 video at 4K or lower, AAC audio.",
    accepts: ["video"],
  },
  {
    id: "instagram-post",
    label: "Instagram Post",
    description:
      "1080×1350 portrait JPEG — the highest-quality shape Instagram accepts for feed posts.",
    prompt:
      "Prepare this image for an Instagram feed post: 1080×1350 (4:5 portrait), high-quality JPEG, sRGB color, fit/crop as needed without distortion.",
    accepts: ["image"],
  },
  {
    id: "youtube-thumbnail",
    label: "YouTube Thumbnail",
    description:
      "1280×720 thumbnail — extracted from a video or resized from an image, with a touch of sharpening.",
    prompt:
      "Make a YouTube thumbnail from this file: 1280×720, JPEG, high quality. If it's a video, extract the best-looking frame; if it's an image, resize and gently sharpen.",
    accepts: ["video", "image"],
  },
  {
    id: "email-pdf",
    label: "Email-safe PDF",
    description:
      "Compresses to under 5 MB so the PDF clears most mail gateways without the recipient getting an attachment-blocked notice.",
    prompt:
      "Compress this PDF so the file is under 5 MB. Keep the text crisp; only recompress images. Strip any embedded metadata.",
    accepts: ["pdf"],
  },
  {
    id: "email-attachment",
    label: "Email attachment",
    description:
      "Shrinks to under 10 MB regardless of file type — works for video, image, or PDF.",
    prompt:
      "Compress this file to under 10 MB so it fits in an email attachment. Pick the right tool for the file type, and aim for the smallest perceptible quality loss.",
    accepts: ["video", "image", "pdf", "audio"],
  },
  {
    id: "print-ready",
    label: "Print-ready",
    description:
      "300 DPI with the color profile preserved — the shape print shops actually want.",
    prompt:
      "Prepare this image for printing: 300 DPI, preserve the original color profile (don't convert to sRGB if it's already CMYK or AdobeRGB), no compression.",
    accepts: ["image"],
  },
];

/** True if a preset is relevant for at least one staged file kind. */
export function presetMatchesFiles(preset, fileKinds) {
  if (!fileKinds || fileKinds.length === 0) return true; // before files staged, show all
  return fileKinds.some((k) => preset.accepts.includes(k));
}

/**
 * Rough kind classifier from a filename. Good enough to filter the quick
 * actions; the sandbox worker does the real content-type detection at run
 * time. Unknown → "other".
 */
export function fileKindFromName(name = "") {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["mp4", "mov", "mkv", "webm", "avi", "m4v", "wmv", "flv"].includes(ext))
    return "video";
  if (["mp3", "wav", "m4a", "flac", "ogg", "aac", "opus", "wma"].includes(ext))
    return "audio";
  if (
    [
      "png",
      "jpg",
      "jpeg",
      "webp",
      "heic",
      "heif",
      "gif",
      "bmp",
      "tiff",
      "svg",
      "avif",
    ].includes(ext)
  )
    return "image";
  if (ext === "pdf") return "pdf";
  return "other";
}
