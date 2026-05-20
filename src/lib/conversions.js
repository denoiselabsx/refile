/**
 * SEO landing-page registry.
 *
 * Each entry generates a /convert/{slug} page via app/convert/[slug]/page.js
 * and is included in the sitemap. Pages are hand-tuned (not templated) so
 * each one has unique intro copy, a unique example prompt, and unique FAQ
 * answers — Google demotes thin/duplicated content, and a generic
 * "Convert {X} to {Y}" page would be exactly that.
 *
 * Field guide:
 *   slug         — URL segment. Lowercase, hyphenated.
 *   from / to    — Format identifiers (lowercase, no dots). Used in copy
 *                  and to seed the composer prompt.
 *   category     — Drives the /formats grouping and related-links section.
 *                  Keep in sync with categoryLabel below.
 *   title        — H1 + <title>. Should literally say what the page is.
 *   intro        — 2-3 sentence opener describing the conversion and what
 *                  ReFile does differently. Plain language.
 *   bullets      — "What you can ask for" bullet list. These are concrete
 *                  natural-language prompts a user can paste in.
 *   examplePrompt — The single prompt we pre-fill into the composer when
 *                  the visitor uploads a file on this page.
 *   faqs         — Array of { q, a }. Renders both in HTML AND as FAQPage
 *                  JSON-LD so Google can show rich results.
 *
 * Adding a 21st entry: append to CONVERSIONS, add to /formats by relying
 * on this file (it iterates), and the sitemap picks it up automatically.
 */

export const CONVERSIONS = [
  // ── Video ────────────────────────────────────────────────────────
  {
    slug: "mp4-to-mp3",
    from: "mp4",
    to: "mp3",
    category: "audio",
    title: "Convert MP4 to MP3 Online — Free",
    intro:
      "Pull the audio out of any MP4 video and save it as an MP3. ReFile uses FFmpeg under the hood, so the conversion is lossless from the source stream — no re-encoding artifacts beyond what's already in the file.",
    bullets: [
      "Extract MP3 at any bitrate (say 'as 320kbps MP3' or '128kbps for podcasts')",
      "Mono or stereo — say 'mix down to mono' for voice recordings",
      "Trim while you're at it — 'just the first 30 seconds as MP3'",
    ],
    examplePrompt: "Convert this MP4 to MP3 at 192kbps.",
    faqs: [
      {
        q: "Is the audio quality the same as the original?",
        a: "Yes — ReFile copies the audio stream when it can, and only re-encodes if you specifically ask for a different bitrate. Either way the output is a standard MP3 playable in any player.",
      },
      {
        q: "How long does it take?",
        a: "A 10-minute MP4 typically converts to MP3 in under 5 seconds. Larger files (1+ hour videos) take longer because the file has to be uploaded first.",
      },
      {
        q: "Do you keep my file?",
        a: "Inputs and outputs are deleted automatically 24 hours after upload. See /security for the full data flow.",
      },
    ],
  },
  {
    slug: "mov-to-mp4",
    from: "mov",
    to: "mp4",
    category: "video",
    title: "Convert MOV to MP4 Online — Free",
    intro:
      "iPhone and Mac record video as MOV (QuickTime), which most Windows players and web uploads choke on. ReFile rewraps to MP4 in seconds — usually without re-encoding, so there's no quality loss.",
    bullets: [
      "Default: stream-copy to MP4 (no quality loss, fastest)",
      "Compress for upload — 'MP4 under 50MB' or 'for WhatsApp'",
      "Resize — '720p MP4' or '1080p MP4 at 30fps'",
    ],
    examplePrompt: "Convert this MOV to MP4 without re-encoding.",
    faqs: [
      {
        q: "Will the conversion lose quality?",
        a: "Not if the source codecs (H.264/HEVC for video, AAC for audio) are already MP4-compatible — in that case ReFile stream-copies, which is bit-identical. If you ask for a smaller file or a different resolution, it re-encodes once.",
      },
      {
        q: "Does it work with HEVC / H.265 MOV files from iPhone?",
        a: "Yes. HEVC is a valid MP4 codec, so the rewrap is lossless. If you need broader compatibility (older devices), ask ReFile to 'transcode to H.264'.",
      },
      {
        q: "What's the file size limit?",
        a: "100 MB on Free, 250 MB on Student, 500 MB on Pro, 2 GB on Power.",
      },
    ],
  },
  {
    slug: "mkv-to-mp4",
    from: "mkv",
    to: "mp4",
    category: "video",
    title: "Convert MKV to MP4 Online — Free",
    intro:
      "MKV is a great container but unsupported in most browsers, iPhones, and TVs. ReFile remuxes MKV to MP4 — same video and audio bytes, new container — so playback works everywhere without re-encoding.",
    bullets: [
      "Lossless container swap (fastest)",
      "Pick one audio track if your MKV has several — 'keep the English track only'",
      "Strip subtitles or burn them in — 'burn the English subs into the video'",
    ],
    examplePrompt: "Convert this MKV to MP4, keeping the video and audio as-is.",
    faqs: [
      {
        q: "Does this re-encode?",
        a: "Not by default — codec copy is the fastest and lossless path. ReFile only re-encodes if your MKV uses a codec that MP4 doesn't support (rare), or if you ask for a specific bitrate or resolution.",
      },
      {
        q: "What about multiple audio tracks?",
        a: "Ask in plain language: 'keep only the English audio', 'use the second audio track'. ReFile picks the right FFmpeg map flags for you.",
      },
    ],
  },
  {
    slug: "webm-to-mp4",
    from: "webm",
    to: "mp4",
    category: "video",
    title: "Convert WebM to MP4 Online — Free",
    intro:
      "WebM (VP8/VP9 video, Opus audio) is the modern web's open video format, but it doesn't play natively on iOS or in many editing tools. ReFile re-encodes WebM to standard H.264/AAC MP4 for universal compatibility.",
    bullets: [
      "Default: H.264 video + AAC audio (works everywhere)",
      "Keep the original quality — 'high-quality MP4'",
      "Strip the audio for a silent video — 'video only, no audio'",
    ],
    examplePrompt: "Convert this WebM to a standard H.264 MP4.",
    faqs: [
      {
        q: "Will I lose quality re-encoding?",
        a: "WebM and MP4 use different video codecs, so a re-encode is required. ReFile uses a high-quality CRF (constant rate factor) by default — perceptually identical to the source for most content.",
      },
      {
        q: "Why not just keep WebM?",
        a: "If your target supports WebM, you should — it's smaller and modern. The MP4 conversion exists because most non-web players, especially on iOS, don't support WebM.",
      },
    ],
  },
  {
    slug: "avi-to-mp4",
    from: "avi",
    to: "mp4",
    category: "video",
    title: "Convert AVI to MP4 Online — Free",
    intro:
      "AVI is a legacy container that almost nothing modern plays natively. ReFile converts AVI to MP4 with H.264 video and AAC audio — the format every device, browser, and editor accepts.",
    bullets: [
      "Default: H.264 / AAC MP4 (universal compatibility)",
      "Compress old camcorder footage — 'compress this AVI under 100MB'",
      "Modern resolution — 'output as 720p MP4'",
    ],
    examplePrompt: "Convert this AVI to a 720p H.264 MP4.",
    faqs: [
      {
        q: "Why doesn't AVI work anymore?",
        a: "AVI is a 1992 container that predates modern codecs. iPhone, Android, every browser, and most editing software either don't support it or struggle with its quirks. MP4 (2003) has effectively replaced it for everything.",
      },
      {
        q: "What if my AVI is from a really old camera?",
        a: "ReFile handles legacy AVI codecs (MJPEG, Xvid, DivX) automatically — it transcodes them to H.264 so the output plays anywhere.",
      },
    ],
  },

  // ── Images ──────────────────────────────────────────────────────
  {
    slug: "heic-to-jpg",
    from: "heic",
    to: "jpg",
    category: "image",
    title: "Convert HEIC to JPG Online — Free",
    intro:
      "iPhones shoot HEIC by default — smaller files, but unreadable on most Windows machines and the majority of websites. ReFile converts HEIC to JPG without losing perceived quality, and can do hundreds at once.",
    bullets: [
      "Single HEIC or batch — 'convert all my HEICs to JPG'",
      "Choose quality — 'JPG at 90% quality' (the default is 92)",
      "Resize at the same time — 'JPG max 1920px wide'",
    ],
    examplePrompt: "Convert this HEIC to a high-quality JPG.",
    faqs: [
      {
        q: "Does the EXIF data (date, location, camera) carry over?",
        a: "Yes by default. If you want privacy, ask 'strip EXIF' or 'remove location metadata'.",
      },
      {
        q: "Why is HEIC smaller than JPG?",
        a: "HEIC uses HEVC compression — about 2× more efficient than JPG. The JPG output will be larger than the HEIC, but compatible everywhere.",
      },
      {
        q: "Can ReFile convert HEIC to PNG instead?",
        a: "Yes — try /convert/heic-to-png, or just ask 'convert this HEIC to PNG'.",
      },
    ],
  },
  {
    slug: "png-to-jpg",
    from: "png",
    to: "jpg",
    category: "image",
    title: "Convert PNG to JPG Online — Free",
    intro:
      "PNG is great for graphics with transparency but huge for photos. Converting to JPG can shrink the file 5-10× with no visible difference. ReFile flattens transparency to white (or any color you specify) so the JPG looks right.",
    bullets: [
      "Default: 92% quality JPG, white background where transparent",
      "Pick a background — 'JPG with black background'",
      "Pick quality — 'JPG at 80%' (smaller, still good)",
    ],
    examplePrompt: "Convert this PNG to a high-quality JPG.",
    faqs: [
      {
        q: "Won't I lose the transparent background?",
        a: "Yes — JPG doesn't support transparency. ReFile flattens to white by default. Specify any other color in your prompt ('with black background', 'with #f5f5f5 background').",
      },
      {
        q: "When should I keep PNG instead?",
        a: "When the image has transparency, large flat areas of color (logos, screenshots, line art), or needs to be lossless. JPG shines for photographs.",
      },
    ],
  },
  {
    slug: "jpg-to-png",
    from: "jpg",
    to: "png",
    category: "image",
    title: "Convert JPG to PNG Online — Free",
    intro:
      "PNG is lossless — once you save a JPG as PNG, no further generations of compression accumulate. Useful for editing workflows, screenshots, and any image you'll re-export later.",
    bullets: [
      "Direct conversion, lossless from this point forward",
      "Add transparency — 'JPG to PNG, make the white background transparent'",
      "Crop or resize alongside — 'PNG cropped to a square'",
    ],
    examplePrompt: "Convert this JPG to PNG.",
    faqs: [
      {
        q: "Will the PNG be higher quality than the JPG?",
        a: "It can't undo JPG compression already in the file. But once it's PNG, any future edits won't compress further — useful if you're editing the image multiple times.",
      },
      {
        q: "Can ReFile remove the white background to make it transparent?",
        a: "Yes — say 'make the background transparent' or 'remove the white background'. Works best on images with a clean, solid-color background.",
      },
    ],
  },
  {
    slug: "webp-to-png",
    from: "webp",
    to: "png",
    category: "image",
    title: "Convert WebP to PNG Online — Free",
    intro:
      "WebP is great for the web but blocked by many apps, design tools, and older platforms. ReFile converts WebP to PNG losslessly, preserving transparency and any animation frames.",
    bullets: [
      "Lossless WebP → PNG conversion",
      "Animated WebP — choose 'first frame as PNG' or 'all frames as a sequence'",
      "Resize — 'PNG at 2x the original size'",
    ],
    examplePrompt: "Convert this WebP to a PNG.",
    faqs: [
      {
        q: "What happens to animated WebPs?",
        a: "By default ReFile exports the first frame. Ask 'export every frame as a PNG sequence' to get all of them as separate files.",
      },
      {
        q: "Is the PNG larger than the WebP?",
        a: "Usually yes — WebP compresses better than PNG. The PNG output is bigger but compatible everywhere.",
      },
    ],
  },
  {
    slug: "webp-to-jpg",
    from: "webp",
    to: "jpg",
    category: "image",
    title: "Convert WebP to JPG Online — Free",
    intro:
      "If you don't need transparency, JPG is the most compatible image format ever made. ReFile converts WebP to JPG at any quality you want, flattening transparency to a background color you pick.",
    bullets: [
      "Default: 92% quality JPG with white background",
      "Custom quality — 'JPG at 85%' for smaller files",
      "Background color — 'with black background'",
    ],
    examplePrompt: "Convert this WebP to a high-quality JPG.",
    faqs: [
      {
        q: "Why convert WebP to JPG?",
        a: "Older platforms, some social media uploaders, print services, and certain CMS systems still don't accept WebP. JPG works everywhere.",
      },
      {
        q: "Will I lose quality?",
        a: "Some — JPG is lossy. At the default 92% quality, the loss is invisible in most photographs.",
      },
    ],
  },
  {
    slug: "svg-to-png",
    from: "svg",
    to: "png",
    category: "image",
    title: "Convert SVG to PNG Online — Free",
    intro:
      "SVGs are vector — infinitely scalable but unsupported in apps that need a raster image (Instagram, most slide decks, OS lockscreens). ReFile rasterizes SVG to PNG at any resolution you want.",
    bullets: [
      "Default: render at the SVG's intrinsic size",
      "Custom resolution — 'PNG at 2048×2048'",
      "Transparent background preserved",
    ],
    examplePrompt: "Convert this SVG to a 1024×1024 PNG.",
    faqs: [
      {
        q: "How big should I make the PNG?",
        a: "Big enough for the largest use case. SVG → PNG is a one-way conversion — you can shrink later, but you can't enlarge without quality loss.",
      },
      {
        q: "Will the PNG have a transparent background?",
        a: "Yes — SVG transparency carries over to PNG, which supports it natively.",
      },
    ],
  },
  {
    slug: "gif-to-mp4",
    from: "gif",
    to: "mp4",
    category: "video",
    title: "Convert GIF to MP4 Online — Free",
    intro:
      "GIFs are huge — a 5-second GIF is often 10× larger than the same content as MP4. ReFile converts GIF to a small, smooth MP4 that plays inline on every platform.",
    bullets: [
      "Massive size reduction (typically 5-20× smaller)",
      "Smoother playback — MP4 supports proper frame rates",
      "Auto-loop — 'looping MP4' if you want forever-playback like a GIF",
    ],
    examplePrompt: "Convert this GIF to a small, looping MP4.",
    faqs: [
      {
        q: "Will the MP4 loop like a GIF?",
        a: "Not by default — most video players don't auto-loop. Most social platforms (Twitter, Discord, Slack) do, though. Ask for 'looping MP4' if you need the loop baked in.",
      },
      {
        q: "Why is the MP4 so much smaller?",
        a: "GIF is limited to 256 colors and uses 1980s compression. MP4 uses modern inter-frame compression (H.264) — orders of magnitude more efficient for moving images.",
      },
    ],
  },

  // ── Audio ───────────────────────────────────────────────────────
  {
    slug: "wav-to-mp3",
    from: "wav",
    to: "mp3",
    category: "audio",
    title: "Convert WAV to MP3 Online — Free",
    intro:
      "WAV is uncompressed — a 3-minute song is ~30 MB. MP3 brings that down to ~3 MB with no audible difference at decent bitrates. ReFile converts WAV to MP3 at any bitrate, from podcast-tier (64kbps mono) to audiophile-tier (320kbps).",
    bullets: [
      "Default: 192kbps stereo MP3 — good balance for music",
      "Voice / podcast — 'MP3 at 64kbps mono'",
      "Audiophile — 'MP3 at 320kbps' (the maximum)",
    ],
    examplePrompt: "Convert this WAV to a 192kbps MP3.",
    faqs: [
      {
        q: "What bitrate should I use?",
        a: "320kbps for music you'll keep, 192kbps for casual listening, 128kbps for voice with some quality, 64kbps mono for pure speech (podcasts, audiobooks).",
      },
      {
        q: "Can ReFile keep it lossless?",
        a: "MP3 is always lossy. For lossless, ask for 'WAV to FLAC' instead — same audio, ~half the size, still lossless.",
      },
    ],
  },
  {
    slug: "m4a-to-mp3",
    from: "m4a",
    to: "mp3",
    category: "audio",
    title: "Convert M4A to MP3 Online — Free",
    intro:
      "M4A is Apple's preferred audio container (AAC inside). Many apps and older devices want MP3 instead. ReFile re-encodes M4A to MP3 at any bitrate, preserving metadata (title, artist, album art) by default.",
    bullets: [
      "Default: 192kbps MP3, metadata preserved",
      "Higher quality — 'MP3 at 320kbps'",
      "Strip metadata for privacy — 'MP3, remove all tags'",
    ],
    examplePrompt: "Convert this M4A to a 192kbps MP3.",
    faqs: [
      {
        q: "Will the MP3 sound the same?",
        a: "At 192kbps or higher, the difference is inaudible to almost everyone. AAC (the codec inside M4A) is slightly more efficient than MP3, so the MP3 file will be a touch larger.",
      },
      {
        q: "Does the album art carry over?",
        a: "Yes — ReFile copies ID3 tags including embedded art by default.",
      },
    ],
  },

  // ── PDF ─────────────────────────────────────────────────────────
  {
    slug: "pdf-to-jpg",
    from: "pdf",
    to: "jpg",
    category: "pdf",
    title: "Convert PDF to JPG Online — Free",
    intro:
      "Pull every page of a PDF out as a separate JPG image — useful for sharing on platforms that don't support PDF, embedding in slide decks, or extracting figures. ReFile uses Poppler so the rendering matches what you see in a real PDF viewer.",
    bullets: [
      "One JPG per page by default",
      "Pick a resolution — 'JPGs at 300dpi' for print, '150dpi' for screen",
      "First page only — 'just the first page as a JPG' (for thumbnails)",
    ],
    examplePrompt: "Convert each page of this PDF to a JPG at 200dpi.",
    faqs: [
      {
        q: "What resolution should I pick?",
        a: "72-100dpi for thumbnails, 150dpi for screen reading, 300dpi for print. Higher dpi means larger files and crisper output.",
      },
      {
        q: "How do I get them as a single image?",
        a: "Ask 'combine all pages into one tall JPG' — ReFile renders each page and stacks them.",
      },
    ],
  },
  {
    slug: "pdf-to-png",
    from: "pdf",
    to: "png",
    category: "pdf",
    title: "Convert PDF to PNG Online — Free",
    intro:
      "PNG keeps every pixel of the rendered page — useful when the PDF has fine lines, technical diagrams, or text you'll want to crop and re-use without JPG compression artifacts.",
    bullets: [
      "One lossless PNG per page",
      "Transparent background — 'PNG with transparent background' (skips the white page)",
      "High-resolution — 'PNG at 600dpi' for print-quality output",
    ],
    examplePrompt: "Convert each page of this PDF to a PNG at 200dpi.",
    faqs: [
      {
        q: "PNG or JPG for a PDF?",
        a: "PNG if the PDF has text, line art, or diagrams — they'll stay crisp. JPG if it's mostly photos or you need smaller files.",
      },
      {
        q: "Why is the PNG so big?",
        a: "PNG is lossless. A page at 300dpi is roughly 2-5 MB per page. If file size matters more than perfect quality, ask for JPG instead.",
      },
    ],
  },
  {
    slug: "png-to-pdf",
    from: "png",
    to: "pdf",
    category: "pdf",
    title: "Convert PNG to PDF Online — Free",
    intro:
      "Combine one or more PNG images into a single PDF — handy for sharing screenshots as a document, building a simple photo report, or stitching scanned pages into something printable.",
    bullets: [
      "Single PNG → single-page PDF",
      "Multiple PNGs → one multi-page PDF, one image per page",
      "Set the paper size — 'PDF as A4' or 'US Letter'",
    ],
    examplePrompt: "Convert these PNGs into a single PDF, one per page.",
    faqs: [
      {
        q: "Will the PDF be searchable?",
        a: "No — the PNG content is embedded as an image. For searchable text, you'd need OCR. Ask 'OCR the PNGs and make a searchable PDF' and ReFile will run Tesseract first.",
      },
      {
        q: "What about file size?",
        a: "The PDF is roughly the sum of the PNGs plus a small overhead. To shrink it, ask 'compress to under 5MB'.",
      },
    ],
  },
  {
    slug: "jpg-to-pdf",
    from: "jpg",
    to: "pdf",
    category: "pdf",
    title: "Convert JPG to PDF Online — Free",
    intro:
      "Turn one or more JPGs into a PDF — the standard way to send photos as a document, package scanned receipts, or build a print-ready report.",
    bullets: [
      "Single JPG → single-page PDF",
      "Multiple JPGs → one multi-page PDF, one photo per page",
      "Specify orientation — 'landscape PDF' for wide photos",
    ],
    examplePrompt: "Combine these JPGs into a single PDF.",
    faqs: [
      {
        q: "Can I add multiple JPGs into one PDF?",
        a: "Yes — drop them all in and say 'combine into a single PDF, one JPG per page'.",
      },
      {
        q: "How big will the PDF be?",
        a: "Roughly the sum of the JPG sizes. To shrink it, add 'under 5MB' to your prompt.",
      },
    ],
  },

  // ── Compression ────────────────────────────────────────────────
  {
    slug: "compress-pdf",
    from: "pdf",
    to: "pdf",
    category: "compress",
    title: "Compress PDF Online — Free",
    intro:
      "Email attachment limits, upload caps, and Slack 25MB walls — PDFs hit them constantly. ReFile uses Ghostscript to shrink PDFs by recompressing images and stripping bloat, with knobs from 'a little smaller' to 'extremely small'.",
    bullets: [
      "Quality presets — 'compress for email' (medium), 'compress as much as possible' (aggressive)",
      "Target size — 'under 5MB' or 'under 1MB'",
      "Keep text crisp — image-only compression, text untouched",
    ],
    examplePrompt: "Compress this PDF to under 5MB.",
    faqs: [
      {
        q: "Will the text get blurry?",
        a: "No — only images are recompressed. Text and vector graphics stay sharp at any compression level.",
      },
      {
        q: "What's the smallest I can go?",
        a: "Depends on the PDF. Text-heavy docs can drop 90%+ with no visible difference; image-heavy docs hit a floor around 30-40% of the original.",
      },
    ],
  },
  {
    slug: "compress-video",
    from: "video",
    to: "video",
    category: "compress",
    title: "Compress Video Online — Free",
    intro:
      "iPhone videos easily hit 100 MB for a minute of 4K. ReFile recompresses video for the platform you actually need it for — WhatsApp's 16MB limit, email's 25MB, or just 'smaller than this'.",
    bullets: [
      "Target a platform — 'for WhatsApp', 'for email', 'for Slack'",
      "Target a size — 'under 25MB' or 'half the size'",
      "Target a resolution — '720p' or '1080p at lower bitrate'",
    ],
    examplePrompt: "Compress this video for WhatsApp (under 16MB).",
    faqs: [
      {
        q: "Will the quality drop?",
        a: "Some — compression is a tradeoff. ReFile tries the smallest quality drop that hits your target. If you need higher quality, ask for a bigger target ('under 50MB' instead of 'under 16MB').",
      },
      {
        q: "What about audio?",
        a: "Audio is recompressed too, at 128kbps AAC by default. For voice-only content, ask for 'mono audio at 64kbps' — saves another few MB.",
      },
    ],
  },
];

/**
 * Look up a conversion entry by slug. Returns null if not found — the
 * page route uses this to decide whether to 404.
 */
export function getConversion(slug) {
  return CONVERSIONS.find((c) => c.slug === slug) ?? null;
}

/** Human label for a category, used by /formats grouping. */
export const CATEGORY_LABEL = {
  video: "Video",
  audio: "Audio",
  image: "Image",
  pdf: "PDF & documents",
  compress: "Compression",
};

/** All categories in display order. */
export const CATEGORIES = ["video", "audio", "image", "pdf", "compress"];

/** Related-page picker: same source format or same target format, capped. */
export function relatedConversions(slug, limit = 4) {
  const me = getConversion(slug);
  if (!me) return [];
  return CONVERSIONS.filter(
    (c) =>
      c.slug !== slug && (c.from === me.from || c.to === me.to || c.category === me.category)
  ).slice(0, limit);
}
