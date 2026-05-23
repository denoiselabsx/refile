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
      "Render the first page of a PDF as a JPG image — useful for thumbnails, sharing on platforms that don't support PDF, embedding in slide decks, or extracting a cover. ReFile uses Poppler so the rendering matches what you see in a real PDF viewer.",
    bullets: [
      "First page rendered at 150 DPI — sharp on every screen",
      "Want every page or 300 DPI print quality? Sign up free",
      "Multi-page PDF: page 1 becomes the JPG, rest of the file is untouched",
    ],
    examplePrompt: "Convert the first page of this PDF to a JPG.",
    faqs: [
      {
        q: "Why just the first page?",
        a: "Rendering every page on the public no-login tool would be slow for large PDFs and would push past size limits. Sign up free and the chat handles multi-page extraction at any resolution.",
      },
      {
        q: "What resolution do I get?",
        a: "150 DPI — comfortable for screen reading and most uploads. For 300 DPI print quality or other resolutions, sign in and ask in the chat.",
      },
      {
        q: "What about page 2, 3, 4…?",
        a: "Anonymous Quick Convert renders page 1 only. Signed-in users get the full conversation experience — say 'render every page as a JPG at 300dpi' and it just works.",
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
      "Render the first page of a PDF as a lossless PNG — useful when the page has fine lines, technical diagrams, or text you'll want to crop and re-use without JPG compression artefacts.",
    bullets: [
      "First page rendered as a lossless PNG at 150 DPI",
      "Crisp text, diagrams, and line art — no JPG compression artefacts",
      "All pages or higher DPI? Sign up free for the full version",
    ],
    examplePrompt: "Convert the first page of this PDF to a PNG.",
    faqs: [
      {
        q: "PNG or JPG for a PDF?",
        a: "PNG if the PDF has text, line art, or diagrams — they'll stay crisp. JPG if it's mostly photos or you need smaller files.",
      },
      {
        q: "Why only the first page?",
        a: "Rendering every page on the no-login tool would be slow on large PDFs and push past size limits. Sign up free and the chat handles every page at any resolution.",
      },
      {
        q: "Is there a transparent background?",
        a: "No — the page is rendered with its original background (usually white). Sign in and ask in the chat for transparent rendering.",
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

  /* ── Audio (extra) ───────────────────────────────────────── */
  {
    slug: "aac-to-mp3", from: "aac", to: "mp3", category: "audio",
    title: "Convert AAC to MP3 Online — Free",
    intro: "AAC files don't play in every editor or older device. ReFile re-encodes to standard 192 kbps MP3 — playable everywhere.",
    bullets: [
      "Default 192 kbps MP3 — transparent quality for most listening",
      "Original tags preserved when present",
      "Single-file or batch via signup",
    ],
    examplePrompt: "Convert this AAC to a 192 kbps MP3.",
    faqs: [
      { q: "Will I lose quality going AAC → MP3?", a: "Both are lossy formats, so a small generation loss is unavoidable. At 192 kbps it is inaudible to most listeners on consumer speakers." },
      { q: "Does the file stay the same length?", a: "Yes — duration is preserved exactly. Only the codec changes." },
    ],
  },
  {
    slug: "flac-to-mp3", from: "flac", to: "mp3", category: "audio",
    title: "Convert FLAC to MP3 Online — Free",
    intro: "FLAC is lossless and bulky. MP3 is portable and small. ReFile compresses your FLAC to a 192 kbps MP3 — about 1/4 the size with broadly transparent quality.",
    bullets: [
      "Default 192 kbps stereo MP3",
      "Tag metadata (artist, title, album) preserved",
      "Ideal for car stereos, phones, and most music apps",
    ],
    examplePrompt: "Convert this FLAC to MP3.",
    faqs: [
      { q: "Will it sound worse?", a: "Slightly — MP3 is lossy. At 192 kbps the difference vs FLAC is undetectable to most listeners. For archival keep the FLAC; for portability use the MP3." },
      { q: "Can I go to 320 kbps instead?", a: "On a signed-in account, yes — ask in the chat. Anonymous Quick Convert uses 192 kbps by default." },
    ],
  },
  {
    slug: "ogg-to-mp3", from: "ogg", to: "mp3", category: "audio",
    title: "Convert OGG to MP3 Online — Free",
    intro: "OGG Vorbis is great for the open-source world but rarely supported by hardware players. ReFile transcodes to 192 kbps MP3.",
    bullets: [
      "192 kbps MP3 — runs on every player",
      "Tag metadata carried through",
      "Quick — most files convert in under 3 seconds",
    ],
    examplePrompt: "Convert this OGG file to MP3.",
    faqs: [
      { q: "Is there quality loss?", a: "OGG → MP3 is a lossy-to-lossy transcode, so yes — slight. 192 kbps minimizes it for typical listening." },
    ],
  },

  /* ── Image (extra) ───────────────────────────────────────── */
  {
    slug: "bmp-to-png", from: "bmp", to: "png", category: "image",
    title: "Convert BMP to PNG Online — Free",
    intro: "BMP is huge and uncompressed; PNG is lossless and ~10× smaller. ReFile re-encodes pixel-for-pixel — no quality change, just a much smaller file.",
    bullets: [
      "Lossless — every pixel preserved",
      "Typical 5–15× size reduction",
      "Transparency supported (PNG handles alpha; BMP does not)",
    ],
    examplePrompt: "Convert this BMP to a PNG.",
    faqs: [
      { q: "Does the image change?", a: "No — PNG is lossless. The file is smaller because PNG compresses pixel data while BMP stores it raw." },
    ],
  },
  {
    slug: "tiff-to-jpg", from: "tiff", to: "jpg", category: "image",
    title: "Convert TIFF to JPG Online — Free",
    intro: "TIFF files from scanners and pro cameras are large. ReFile re-encodes to a high-quality (q=92) JPG — usually 5–10% the size, easy to share and upload.",
    bullets: [
      "High-quality JPG (q=92) — visibly indistinguishable for photos",
      "Multi-page TIFF: first page is converted by default",
      "EXIF/colour metadata stripped for privacy",
    ],
    examplePrompt: "Convert this TIFF to a high-quality JPG.",
    faqs: [
      { q: "Will it look the same as the TIFF?", a: "At q=92 the JPG is visually indistinguishable from the TIFF for any photographic content. Line-art and screenshots compress better as PNG — use TIFF → PNG instead for those." },
      { q: "What about transparency?", a: "JPG has no transparency. Any transparent pixels become solid white. Use TIFF → PNG to preserve alpha." },
    ],
  },
  {
    slug: "png-to-webp", from: "png", to: "webp", category: "image",
    title: "Convert PNG to WebP Online — Free",
    intro: "WebP delivers PNG-class quality at 25–40% smaller file sizes. ReFile re-encodes your PNG to WebP at quality 92 — ideal for web upload and faster page loads.",
    bullets: [
      "Default quality 92 — visually lossless",
      "Transparency preserved (WebP supports alpha)",
      "Supported in every modern browser",
    ],
    examplePrompt: "Convert this PNG to WebP.",
    faqs: [
      { q: "Is WebP supported everywhere?", a: "Yes in every modern browser (Chrome, Safari, Firefox, Edge since 2020). Some older image editors don't read WebP yet — keep the PNG as a master if that matters." },
      { q: "Will I see compression artifacts?", a: "At q=92, no — WebP is exceptionally good at smooth gradients and photos at this quality level." },
    ],
  },
  {
    slug: "jpg-to-webp", from: "jpg", to: "webp", category: "image",
    title: "Convert JPG to WebP Online — Free",
    intro: "WebP shrinks JPG files another 25–35% with no visible quality loss. ReFile re-encodes at quality 92 — drop-in replacement for your JPGs on the web.",
    bullets: [
      "25–35% smaller than the source JPG",
      "Quality 92 — no visible artefacts",
      "Faster page loads, lower bandwidth bills",
    ],
    examplePrompt: "Convert this JPG to WebP.",
    faqs: [
      { q: "Should I serve WebP to all visitors?", a: "Yes — every modern browser supports it. For pre-2020 browsers, set up a <picture> fallback to the original JPG." },
    ],
  },

  /* ── PDF & images (extra) ────────────────────────────────── */
  {
    slug: "images-to-pdf", from: "images", to: "pdf", category: "pdf",
    title: "Combine Images Into PDF Online — Free",
    intro: "Bundle several JPG, PNG, or WebP images into a single PDF — one image per page, in the order you uploaded them. Great for sending a stack of photos as one document.",
    bullets: [
      "Drop multiple files at once — order is preserved",
      "Each image becomes one PDF page, sized to the image",
      "Mixed formats OK (JPG + PNG + WebP in the same PDF)",
    ],
    examplePrompt: "Combine these images into a single PDF.",
    faqs: [
      { q: "What's the page order?", a: "Whatever order you upload in. Reorder by removing and re-adding files." },
      { q: "Does it compress the images?", a: "Not by default — to keep quality. If you want a smaller PDF, run Compress PDF on the result." },
    ],
  },
  {
    slug: "pdf-to-docx", from: "pdf", to: "docx", category: "document",
    title: "Convert PDF to Word Online — Free",
    intro: "Get an editable Word document from your PDF. ReFile uses LibreOffice's PDF importer — best for text-heavy, born-digital PDFs. Scans need OCR (sign up for that).",
    bullets: [
      "Editable .docx output you can open in Word, Pages, or Google Docs",
      "Layout and most formatting preserved",
      "Works best on PDFs created from text (not scans)",
    ],
    examplePrompt: "Convert this PDF into an editable Word document.",
    faqs: [
      { q: "Will the layout be perfect?", a: "Close, not perfect. PDF and Word have different layout models, so columns and complex tables sometimes shift slightly. The text content always converts accurately for born-digital PDFs." },
      { q: "What about scanned PDFs?", a: "Scans need OCR (optical character recognition) to extract text. Anonymous Quick Convert doesn't do OCR — sign up and the chat handles it." },
    ],
  },

  /* ── Documents ───────────────────────────────────────────── */
  {
    slug: "docx-to-pdf", from: "docx", to: "pdf", category: "document",
    title: "Convert Word to PDF Online — Free",
    intro: "Send your Word documents as PDFs — no formatting surprises on the recipient's end. ReFile uses LibreOffice headless to render a faithful PDF, fonts and all.",
    bullets: [
      "Faithful layout — fonts, headings, tables, images all preserved",
      "Single-file PDF, ready to share or print",
      "Works with .doc and .docx",
    ],
    examplePrompt: "Convert this Word document to a PDF.",
    faqs: [
      { q: "Do my fonts come through?", a: "If they're standard system fonts, yes. Custom-installed fonts on your machine won't be available to the converter — but the layout still renders with a best-match substitute." },
      { q: "Can I password-protect the PDF?", a: "Not from anonymous Quick Convert. Sign in and the chat can do it." },
    ],
  },
  {
    slug: "pptx-to-pdf", from: "pptx", to: "pdf", category: "document",
    title: "Convert PowerPoint to PDF Online — Free",
    intro: "Turn your slides into a shareable PDF — one slide per page. Works for .ppt and .pptx; animations are flattened to the final visible state.",
    bullets: [
      "One slide per PDF page",
      "Speaker notes excluded by default",
      "Embedded fonts and images preserved",
    ],
    examplePrompt: "Convert this PowerPoint to a PDF.",
    faqs: [
      { q: "What happens to animations?", a: "They're flattened — each slide renders in its final state. PDF can't replay animations." },
      { q: "Are notes included?", a: "Not by default. Sign in and ask for 'PDF with speaker notes' in the chat." },
    ],
  },
  {
    slug: "xlsx-to-pdf", from: "xlsx", to: "pdf", category: "document",
    title: "Convert Excel to PDF Online — Free",
    intro: "Print-ready PDF from your spreadsheet. Each sheet becomes its own PDF page; column widths and formatting are preserved exactly as Excel renders them.",
    bullets: [
      "One PDF page per sheet",
      "Column widths, fonts, borders all preserved",
      "Charts and embedded images included",
    ],
    examplePrompt: "Convert this Excel spreadsheet to a PDF.",
    faqs: [
      { q: "What if my sheet is too wide for one page?", a: "It wraps to multiple pages (just like Excel's default print behavior). To force fit-to-page, sign in and ask in the chat." },
    ],
  },
  {
    slug: "odt-to-pdf", from: "odt", to: "pdf", category: "document",
    title: "Convert ODT to PDF Online — Free",
    intro: "OpenDocument Text → PDF in seconds. Native LibreOffice format, so the conversion is perfectly faithful to what you'd see opening the file in LibreOffice Writer.",
    bullets: [
      "Pixel-perfect — ODT is LibreOffice's native format",
      "All formatting preserved (styles, lists, tables, images)",
      "Single PDF output",
    ],
    examplePrompt: "Convert this ODT to a PDF.",
    faqs: [
      { q: "Why ODT not DOCX?", a: "Different tools — both work. ODT is the OpenDocument standard; DOCX is Microsoft's. ReFile handles both equally." },
    ],
  },
  {
    slug: "txt-to-pdf", from: "txt", to: "pdf", category: "document",
    title: "Convert Text File to PDF Online — Free",
    intro: "Wrap your plain text file in a PDF so it prints nicely, shares cleanly, and looks like a finished document. Monospace font, sensible margins, page numbers.",
    bullets: [
      "Monospace font, 11pt — readable, code-friendly",
      "Auto page breaks, sensible margins",
      "UTF-8 input fully supported",
    ],
    examplePrompt: "Convert this text file to a PDF.",
    faqs: [
      { q: "Does it preserve line breaks?", a: "Yes. Each line in the text file becomes a line in the PDF, with wrapping for very long lines." },
    ],
  },
  {
    slug: "md-to-pdf", from: "md", to: "pdf", category: "document",
    title: "Convert Markdown to PDF Online — Free",
    intro: "Pandoc-rendered PDF from your Markdown — headings, lists, code blocks, tables, and links all styled properly. Great for sharing READMEs and notes.",
    bullets: [
      "Pandoc-rendered — proper Markdown semantics",
      "Code blocks syntax-styled",
      "Tables, footnotes, blockquotes all supported",
    ],
    examplePrompt: "Convert this Markdown file to a PDF.",
    faqs: [
      { q: "Are GitHub Flavored Markdown extensions supported?", a: "Most: tables, task lists, fenced code, strikethrough. Some edge cases (alerts, emoji shortcodes) may not render exactly as GitHub shows them." },
      { q: "Can I include custom CSS?", a: "Not from anonymous Quick Convert. Sign in for advanced options." },
    ],
  },
  {
    slug: "html-to-pdf", from: "html", to: "pdf", category: "document",
    title: "Convert HTML to PDF Online — Free",
    intro: "Render an HTML page to PDF with full CSS support — backgrounds, fonts, layouts. ReFile uses wkhtmltopdf, the industry-standard HTML rendering engine.",
    bullets: [
      "Full CSS layout — backgrounds, web fonts, flexbox",
      "Print stylesheets respected",
      "Single self-contained HTML files only (no remote assets fetched)",
    ],
    examplePrompt: "Convert this HTML file to a PDF.",
    faqs: [
      { q: "Will external images and stylesheets work?", a: "External http(s) URLs are NOT fetched by the sandbox for security reasons. Inline your CSS and use data: URIs (or base64) for images to render fully." },
      { q: "What about JavaScript?", a: "Static rendering only — JS is not executed. The PDF reflects the HTML as written." },
    ],
  },
  {
    slug: "docx-to-epub", from: "docx", to: "epub", category: "document",
    title: "Convert Word to EPUB Online — Free",
    intro: "Turn a Word document into an EPUB e-book — readable on Kindle (via send-to-kindle), Apple Books, Google Play Books, and every other e-reader.",
    bullets: [
      "Standard EPUB3 output",
      "Headings become chapter breaks automatically",
      "Embedded images carried through",
    ],
    examplePrompt: "Convert this Word document into an EPUB e-book.",
    faqs: [
      { q: "Can Kindle read it?", a: "Yes — email it to your Kindle (send-to-kindle) and it'll arrive converted to AZW3 automatically." },
      { q: "What about a cover image?", a: "If your DOCX starts with an image, it becomes the cover. To set one explicitly, sign in and ask in the chat." },
    ],
  },
  {
    slug: "svg-to-pdf", from: "svg", to: "pdf", category: "image",
    title: "Convert SVG to PDF Online — Free",
    intro: "Vector-preserving SVG → PDF — the result is true PDF vectors, infinitely scalable and crisp on print, not a raster image embedded in a PDF.",
    bullets: [
      "True vector output — zoom or print at any size, stays sharp",
      "All SVG shapes, paths, and text preserved",
      "Tiny file size (vectors only, no rasterised pixels)",
    ],
    examplePrompt: "Convert this SVG to a vector PDF.",
    faqs: [
      { q: "Are fonts embedded?", a: "Standard SVG fonts (system + Google Fonts referenced in the SVG) are. Custom files would need to be inlined into the SVG before conversion." },
    ],
  },

  /* ── Data ────────────────────────────────────────────────── */
  {
    slug: "csv-to-xlsx", from: "csv", to: "xlsx", category: "data",
    title: "Convert CSV to Excel Online — Free",
    intro: "Get a proper Excel spreadsheet (.xlsx) from your CSV — column types auto-detected, no more 'opens as text' frustration in Excel.",
    bullets: [
      "Auto column-type detection (numbers stay numbers, dates stay dates)",
      "First row treated as headers",
      "UTF-8 CSV fully supported",
    ],
    examplePrompt: "Convert this CSV to an Excel spreadsheet.",
    faqs: [
      { q: "What if my CSV uses semicolons?", a: "LibreOffice auto-detects the delimiter. Comma, semicolon, and tab all work." },
      { q: "Will dates be detected?", a: "ISO dates (2024-01-15) and common locale formats yes. Ambiguous formats (01/02/03) may be guessed differently — disambiguate with ISO if it matters." },
    ],
  },
  {
    slug: "xlsx-to-csv", from: "xlsx", to: "csv", category: "data",
    title: "Convert Excel to CSV Online — Free",
    intro: "Extract a clean CSV from your spreadsheet — comma-separated, UTF-8, first sheet only. Perfect for importing into databases, scripts, and other data tools.",
    bullets: [
      "First sheet only (sign in for multi-sheet export)",
      "UTF-8 encoded, RFC 4180 compliant",
      "Formulas evaluated to their result values",
    ],
    examplePrompt: "Convert this Excel spreadsheet to a CSV.",
    faqs: [
      { q: "What if I have multiple sheets?", a: "Only the first sheet is exported by default. Sign in and ask in the chat for per-sheet CSV exports." },
      { q: "Do formulas become CSV columns?", a: "Yes — the calculated value is written. The original formula is not preserved (CSV has no formula concept)." },
    ],
  },
  {
    slug: "csv-to-json", from: "csv", to: "json", category: "data",
    title: "Convert CSV to JSON Online — Free",
    intro: "Pandoc-converted JSON from your CSV — the first row becomes object keys, the remaining rows become an array of objects. Ready to drop into a script or API.",
    bullets: [
      "First row → JSON object keys",
      "Each remaining row → an object in the array",
      "UTF-8 encoded output",
    ],
    examplePrompt: "Convert this CSV to a JSON file.",
    faqs: [
      { q: "What if my CSV has no header?", a: "The first row will be used as keys regardless. Add a header row if needed, or sign in to handle headerless CSVs in chat." },
      { q: "Are all values strings?", a: "Yes — CSV has no native type system. Numeric strings stay as strings in the JSON. Cast them in your downstream code." },
    ],
  },

  /* ── Compress (extra) ────────────────────────────────────── */
  {
    slug: "compress-image", from: "image", to: "image", category: "compress",
    title: "Compress Images Online — Free",
    intro: "Shrink JPGs, PNGs, WebPs, and more — without visible quality loss. Optional target size if you need to fit a specific upload limit.",
    bullets: [
      "Smart quality reduction — typically 50–70% smaller",
      "Optional target size — 'under 1MB' and we'll hit it",
      "Strips metadata (EXIF, GPS) for privacy",
    ],
    examplePrompt: "Compress this image as much as possible.",
    faqs: [
      { q: "Will I see quality loss?", a: "Visually, almost never at the default setting. If you ask for a very tight target ('under 100KB' on a big photo), some artefacts may appear — we'll deliver the smallest version with the best quality possible." },
      { q: "Does it remove EXIF / GPS?", a: "Yes — metadata is stripped for privacy. The pixels are unchanged." },
    ],
  },
  {
    slug: "compress-audio", from: "audio", to: "audio", category: "compress",
    title: "Compress Audio Online — Free",
    intro: "Shrink large audio files — voice memos, podcasts, music — to a smaller MP3 at a sensible quality level. Specify a target size if you need to fit an upload limit.",
    bullets: [
      "Re-encoded to MP3 — broadest compatibility",
      "Optional target size for upload limits",
      "Defaults preserve speech intelligibility at 64 kbps mono if asked",
    ],
    examplePrompt: "Compress this audio file.",
    faqs: [
      { q: "Does it work on music?", a: "Yes — but music tolerates compression less than speech. Use at least 128 kbps if you care about quality." },
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
  pdf: "PDF",
  document: "Documents",
  data: "Spreadsheets & data",
  compress: "Compression",
};

/** All categories in display order. */
export const CATEGORIES = [
  "pdf",
  "image",
  "video",
  "audio",
  "document",
  "data",
  "compress",
];

/** Related-page picker: same source format or same target format, capped. */
export function relatedConversions(slug, limit = 4) {
  const me = getConversion(slug);
  if (!me) return [];
  return CONVERSIONS.filter(
    (c) =>
      c.slug !== slug && (c.from === me.from || c.to === me.to || c.category === me.category)
  ).slice(0, limit);
}
