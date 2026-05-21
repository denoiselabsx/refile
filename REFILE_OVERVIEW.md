# ReFile — Product & Engineering Overview (for RAG ingestion)

> Single self-contained document describing what ReFile is, who it is for, how it works, the stack it runs on, its data model, pricing, and operational details. Written so an LLM with retrieval can answer factual questions about ReFile from this one file. Last refreshed against the repo on 2026-05-20.

---

## 1. What ReFile is

ReFile is an **AI-native file automation tool**. A user describes what they want done to a file in plain language — "compress this MP4 for WhatsApp", "extract page 3 of this PDF as an image", "remove the background from this photo" — uploads the file(s), and ReFile returns the finished output. There is no terminal, no choice of tool, no menu of buttons per format.

Under the hood, ReFile is a **natural-language → shell-command** layer over an ephemeral Linux container that has the standard open-source file toolchain preinstalled (ffmpeg, ImageMagick, qpdf, ghostscript, poppler, pandoc, tesseract, rembg, and more). A large language model turns the user's intent into a single validated shell command (or a short pipeline of commands); a sandbox runs the command against the uploaded files; the resulting files are stored and served back as downloads.

ReFile is a product of **Denoise Labs**. The codebase is MIT-licensed.

### One-line positioning

> "Describe what you want, drop the file, get the exact shell command — and the result."

### Key product principle (codified in `convex/prompts.ts`)

> "Never ship the command machinery... ReFile sells the outcome, not the toolbox."

The tool names, command flags, and command text are intentionally **hidden from the end user**. They are present internally for debugging and the developer-facing REST API, but the consumer UI shows only the natural-language prompt and the downloadable result. This is a deliberate strategic posture — see `memory/hide-tool-internals.md`.

---

## 2. Who ReFile is for

Four overlapping audiences:

1. **Non-technical people who currently lose time to format hell** — "I have a .heic from my iPhone and the website only accepts .jpg", "this PDF is too big to email". They don't know what ImageMagick is and shouldn't have to.
2. **Operators / SMB power users** who run the same conversion repeatedly. They use **presets** (saved recipes) and **workflows** (chained presets) to make their repeat work deterministic.
3. **Students and budget users** in price-sensitive markets (notably India), served by region-aware pricing.
4. **Developers** who want a "natural-language file conversion" REST API — covered by the `apiKeys` table and `/api/v1/*` endpoints.

The competitive frame is documented in `COMPETITIVE_RESEARCH.md`: CloudConvert / Zamzar / Convertio / iLovePDF / Smallpdf are the incumbents. Their common weakness is that they require the user to already know the exact source format, target format, and tool. ReFile accepts **intent** instead.

---

## 3. Stack

| Layer | Technology | Role |
|---|---|---|
| Frontend | **Next.js 16 (App Router)** + React 19 + Tailwind CSS 4 | UI, routes, edge functions |
| Backend / DB | **Convex** (`acoustic-guanaco-615` dev, `cool-stork-372` prod) | Database, auth, realtime, file storage, server-side queries / mutations / actions |
| Sandbox compute | **Modal** (Python, FastAPI) | Ephemeral Debian container with the shell-tool stack; HTTP-invoked from Convex |
| LLM | **Groq** (Llama family, currently `llama-4-scout-17b`) | Turns natural-language prompts into shell commands |
| Voice (optional) | **OpenAI Whisper** via a Next.js edge route | Voice-to-text for the composer; supports several Indian languages + English |
| Hosting | **Vercel** (frontend), **Convex Cloud** (backend), **Modal Cloud** (sandbox) | All three are deploy-on-push |
| Auth | **Convex Auth** + Google OAuth | Convex Auth owns the OAuth callback URLs |
| Billing | **Polar** (Merchant of Record) | Subscriptions, metered overage, regional pricing, customer portal |

### Repo layout

```
/                      Next.js app
├── src/app/           Routes (App Router) — landing, /convert, /dashboard, /pricing, /presets, /workflow, /docs, /api, /admin, /d/{shareCode}, /login, /settings, /developers, /community, /changelog, /formats, /security, /privacy, /terms, /status
├── src/components/    UI: composer, shell, chat, presets, pricing CTA, usage meter, command palette, brand, docs, settings, admin
├── src/contexts/      React contexts (auth)
├── src/lib/           Frontend helpers
├── lib/               Portable shared code: lib/plans.js (pricing source of truth), lib/polar.js, lib/region.js, lib/sanitize.js, lib/analytics-events.js, lib/upgrade.js, lib/docs-nav.js, lib/request-origin.js
├── convex/            Convex backend (schema, queries, mutations, actions, crons, http, webhooks)
├── modal/             Modal worker (Python) that runs shell commands
└── public/            Static assets
```

---

## 4. Architecture (end-to-end request flow)

```
Browser (Next.js)
   │
   │   user types prompt + uploads file(s)
   ▼
Convex action: chats.submitTurn / prompts.run
   │
   ├─ stores file blobs in Convex File Storage
   │
   ├─ Groq call → natural-language prompt becomes
   │     { kind: "command" | "chat" | "pipeline",
   │       command, tool, inputFiles, outputFiles, description }
   │
   ├─ security validator (convex/commandValidator.ts) rejects
   │   command if it touches python, network, /etc, etc.
   │
   ├─ semantic corrector (convex/commandCorrector.ts) repairs
   │   common LLM mistakes (e.g. magick→convert on IM6)
   │
   ├─ Convex downloads the file blobs and HTTP-POSTs them with
   │   the validated command to MODAL_WORKER_URL (multipart)
   │
   ▼
Modal worker (modal/worker.py)
   - ephemeral Debian container with the toolchain
   - runs `bash -lc "<command>"` in a temp dir with the uploads
   - returns { exit_code, stdout, stderr, outputs:[{filename,content_base64},...] }
   │
   ▼
Convex receives outputs → stores them as new blobs →
   updates the prompts row (status:"completed", outputStorageIds, sandboxLogs)
   │
   ▼
Browser sees the realtime update → renders the result with
   download button(s); user can also generate a 24h share link
   via the shareLinks table (/d/{shortCode}).
```

Multi-step pipelines (`kind="pipeline"`) write one row per step into `prompts.pipelineSteps`; only the **last** step's outputs survive as `outputStorageIds` — intermediates are discarded.

### Self-improving loop

A nightly cron (`convex/reviewFailures.ts` + `convex/learnedLessons.ts`) clusters recent failed jobs by a stable signature (tool + normalized error phrase), distills a one-line lesson per cluster, and writes it to the `learnedLessons` table as `status:"pending"`. An admin approves or rejects. **Only `approved` lessons** are appended to the system prompt the next time runJob calls Groq. The hand-written `SYSTEM_PROMPT` itself is never mutated by the loop.

---

## 5. The Modal sandbox (`modal/worker.py`)

A single Modal function exposed as a FastAPI POST endpoint at `https://<workspace>--refile-worker-run.modal.run`.

### Image

Debian slim + Python 3.12, apt-installed groups:

- **Core media:** ffmpeg, imagemagick, sox, libsox-fmt-all, lame, opus-tools, mkvtoolnix
- **Documents:** pandoc, libreoffice (headless), wkhtmltopdf, antiword, catdoc
- **PDF:** qpdf, ghostscript, poppler-utils
- **Images++:** webp, libheif-examples (heif-convert), libavif-bin (avifenc/avifdec), librsvg2-bin (rsvg-convert), libimage-exiftool-perl
- **OCR:** tesseract-ocr (eng, hin, osd)
- **Archives:** zip, unzip, p7zip-full, xz-utils, bzip2, gzip
- **Data:** jq, xmlstarlet, csvkit (pip)
- **AI:** `rembg[cli]==2.0.59` for background removal, pinned with `huggingface_hub==0.25.2` and `gradio==4.44.1` because newer hub versions removed `HfFolder`, which crashes the rembg CLI at import time.

Build-time tweaks:

- ImageMagick policy is patched to **re-enable PDF/PS/EPS/XPS coders** (Debian disables them by default for security).
- `magick` is symlinked to `convert` so IM7-style commands work on IM6.
- The rembg `u2net` model (~170 MB) is **pre-baked into the image** by running a real cutout on a 64×64 seed PNG at build time. `U2NET_HOME` is set so the runtime CLI finds the baked model and avoids a download on every cold start.

### Runtime config

- `cpu=2`, `memory=2048`, `timeout=300s` (240s exec cap + headroom)
- `scaledown_window=60` — containers die 60s after going idle (instead of Modal's 300s default) to stay well within the free-tier ~$30/mo credit.
- `max_containers=4` — hard cap so a traffic spike or retry storm cannot drain the credits.
- Optional `SECRET` env var: if set, the worker requires `Authorization: Bearer <SECRET>` on every request. Convex's `MODAL_WORKER_TOKEN` must match.

### HTTP contract

POST multipart/form-data with:

- `command` — the shell command string (already validated and corrected by Convex)
- `expected_outputs` — JSON-encoded list of filenames the worker should collect
- `files` — one or more uploaded files

Filenames are rejected if they contain `/`, start with `.`, or start with `-` (a leading dash would be parsed as a CLI flag by tools like rembg's Click parser; bash quoting does not stop downstream argument parsing). The command runs as `bash -lc "<command>"` inside a `tempfile.TemporaryDirectory`.

Response JSON:

```json
{
  "exit_code": 0,
  "stdout": "…last 8000 chars…",
  "stderr": "…last 8000 chars…",
  "outputs": [{"filename": "out.webp", "content_base64": "…"}]
}
```

---

## 6. Convex backend — data model

Defined in `convex/schema.ts`. Tables:

### Auth & roles

- **(authTables)** — provided by `@convex-dev/auth/server`: users, sessions, accounts, etc.
- **userRoles** — `userId → role ("admin" | "user")`. Kept separate from `users` so role churn does not touch the auth-managed table.

### Plans, usage, billing

- **userPlans** — one row per user. Fields: `plan` ("free" | "student" | "pro" | "power"), `updatedAt`, `region` ("global" | "IN"), `regionMismatch` (true when a user bought an India-priced product from a non-IN billing country — they are forced back to global pricing), `onboardedAt`, and Polar linkage (`polarCustomerId`, `polarSubscriptionId`, `polarSubscriptionStatus`, `polarCurrentPeriodEnd`). **Absence of a row = Free plan**.
- **userUsage** — per-user, per-period metered usage. Free users get one row per UTC day (`period="YYYY-MM-DD"`, `periodKind:"day"`); paid users get one row per UTC month (`period="YYYY-MM"`, `periodKind:"month"`). Fields: `conversions`, `groqInputTokens`, `groqOutputTokens`, `modalMs` (wall-clock proxy), `bytesProcessed`. **Written only on successful conversions** so failures are never counted or charged. A legacy `month` column is double-written for one deploy cycle.

### Presets & likes

- **presets** — saved recipes. Fields: `userId`, `name`, `description`, `category` (image/video/audio/pdf/document/archive/other), `tool` (imagemagick/ffmpeg/poppler/pandoc/ghostscript/qpdf/custom), `commandTemplate`, `inputFilePatterns[]` (`{name, extensions[], description?}`), `outputFilePatterns[]` (`{name, template?, description?}`), `tags[]`, `isPublic`, `isVerified`, `likesCount`, `usageCount`. Search index on `name` filtered by `category`/`tool`/`isPublic`.
- **presetLikes** — many-to-many between users and presets.

### Conversations

- **chats** — one row per conversation session. Fields: `userId`, `title`, `lastActivity`, `favorite?`. Title is full-text-searchable per user.
- **prompts** — one row per chat turn. The big table. Fields:
  - Identity: `userId`, `chatId?`, `turnIndex?`
  - Input: `prompt`, `inputStorageIds[]`, `inputFilenames[]`
  - Lifecycle: `status` ∈ {`pending`, `generating`, `running`, `completed`, `failed`}
  - AI output: `aiKind` ∈ {`command`, `chat`}, `aiMessage?` (chat replies), `aiCommand?`, `aiCommandTemplate?`, `aiDescription?`, `aiTool?`, `aiInputFiles?`, `aiOutputFiles?`
  - Execution output: `outputStorageIds?`, `outputFilenames?`, `sandboxLogs?`, `errorMessage?`
  - Failure classification: `failureKind?` ∈ {`complex`, `noInput`, `noOutput`, `execError`, `config`, `aiError`}. `errorMessage` stays internal; `failureKind` is the **only** signal the UI may act on.
  - Pipeline: `pipelineSteps?[]` — array of `{description, tool, command, status, logs?}`. Up to 6 (Free/Student) or 12 (Pro/Power) entries.
  - Retention: `filesExpired?` — set by the cleanup cron when output blobs are deleted.
  - Billing idempotency: `billedToPolar?` — true once the usage event has been ingested to Polar; prevents double-billing on a runJob retry.
  - Chaining: `chainedFromPromptId?` — when a turn auto-chained from a previous turn's output (no new upload, no filename in the prompt). UI renders "Following up on {prev output} ↻".
  - Source: `source?` ∈ {`api`, `ui`} (absent = ui); `webhookUrl?` for API jobs.

### Self-improvement

- **learnedLessons** — `title`, `lesson`, `signature` (dedupe key), `tool`, `occurrences`, `examplePrompt`, `exampleCommand`, `exampleError`, `status` ∈ {`pending`, `approved`, `rejected`, `superseded`}, plus `reviewedBy/At/Note`. Only `approved` rows are injected into the runJob prompt.

### Visual workflows

- **workflows** — `userId`, `name`, `nodes` (any), `edges` (any). Drives the `/workflow` canvas.

### Public API

- **apiKeys** — `userId`, `name`, `keyHash` (sha256 of raw key — raw key is **never stored**), `keyPrefix` (first 11 chars of raw key for display, e.g. `rf_live_abc`), `createdAt`, `lastUsedAt?`, `revokedAt?` (soft delete), `scopes[]` (v1 = `["jobs:write","jobs:read"]`).
- **apiUsage** — gate state per user: `totalJobs`, `hasPaymentMethod`, `paymentMethodCheckedAt`. Separate from `userUsage` because it is lifetime + payment-method cache, not period billing.

### Analytics

- **events** — raw event rows. `userId?`, `anonId?` (client UUID in localStorage), `name` (see `lib/analytics-events.js`), `props?`, `at` (Date.now), `day` ("YYYY-MM-DD" UTC). Pruned to ~30 days by cron.
- **eventDailyRollup** — `day`, `name`, `count`, `uniqueUsers`. Written ~00:30 UTC by the analyticsRollup cron so dashboards don't scan raw events.

### Sharing

- **shareLinks** — `userId`, `promptId`, `storageId`, `filename`, `sizeBytes`, `shortCode` (nanoid), `createdAt`, `expiresAt` (createdAt + 24 h, matches retention), `revoked`, `viewCount`. Public route `/d/{shortCode}` re-signs the storage URL and serves a download page. If the underlying blob has been cleaned up, the page shows "this file has expired" rather than 404.

---

## 7. The command pipeline (LLM → shell)

Lives in `convex/runJob.ts`, `convex/prompts.ts`, `convex/commandValidator.ts`, and `convex/commandCorrector.ts`. The flow is:

1. **Plan** — Groq is given `SYSTEM_PROMPT` (hand-written, includes the recipe book of proven command forms) + any **approved** rows from `learnedLessons`. The user prompt is passed in along with the names of uploaded files. The model returns a JSON plan:
   - `kind:"chat"` → plain conversational reply (no command)
   - `kind:"command"` → single shell command + tool name + expected outputs
   - `kind:"pipeline"` → ordered list of commands (up to plan limit)
2. **Validate** — the security validator rejects anything that touches `python`, the network, `/etc`, etc. Pipeline plans go through `validatePlan` which also enforces MVP policy decisions on which multi-step compositions are allowed.
3. **Correct** — the semantic corrector fixes common LLM mistakes that are not security issues but break execution (e.g. `magick` → `convert` on IM6, fixing IM PDF policy phrasing). See `memory/command-pipeline.md`.
4. **Execute** — Convex POSTs the command + files + expected output names to the Modal worker URL.
5. **Persist** — outputs become new Convex storage blobs; the `prompts` row is updated with `outputStorageIds`, `outputFilenames`, `sandboxLogs`, and `status:"completed"`.
6. **Meter** — on success only, increment the current period's `userUsage` row (`conversions++`, plus `groqInputTokens`, `groqOutputTokens`, `modalMs`, `bytesProcessed`).
7. **Bill** — for paid users on overage, ingest a usage event to Polar exactly once (gated by `prompts.billedToPolar`).

### Failure classification

`failureKind` separates user-fixable errors (`noInput`, `noOutput`), server problems (`config`, `aiError`, `execError`), and "your ask was too big for one shot" (`complex`). The browser is allowed to **only** act on `failureKind`, never on raw `errorMessage` text. This matters because LLM-failure copy must generalize, not enumerate (see `memory/generalize-not-enumerate.md`).

---

## 8. Pricing (locked 2026-05-16)

Source of truth: **`lib/plans.js`** — imported by both the Next.js frontend (pricing page, dashboard usage meter) and the Convex backend (quota gate, metering). Plans are region-aware: **quotas/limits are identical across regions; only price differs**. India pays less for the same product.

| Plan    | Global price | India price | Period | Included conversions | Overage             | Max file | Files/conv | Pipeline steps | Presets    | History  | Support         |
|---------|--------------|-------------|--------|----------------------|----------------------|----------|------------|----------------|------------|----------|-----------------|
| Free    | $0           | $0          | day    | 10                   | hard stop (no PAYG)  | 100 MB   | 1          | 6              | 3          | 30 turns | Community       |
| Student | $4/mo        | $2/mo       | month  | 100                  | $0.02 / conversion   | 250 MB   | 10         | 6              | 25         | unlimited| Email           |
| Pro     | $7/mo        | $5/mo       | month  | 750                  | $0.02 / conversion   | 500 MB   | 25         | 12             | unlimited  | unlimited| Email           |
| Power   | $20/mo       | $15/mo      | month  | 3000                 | $0.02 / conversion   | 2 GB     | 50         | 12             | unlimited  | unlimited| Priority email  |

### Region detection & integrity

Region is detected from `x-vercel-ip-country` (Vercel's IP header) and **verified against Polar's collected billing country in the subscription webhook**. A user who buys the India-priced product from a non-IN billing country is downgraded to global pricing and flagged with `regionMismatch:true` on their `userPlans` row. Unknown region falls back to `global` (the higher price).

### Quota semantics

- **Free** resets daily at UTC midnight, hard stop. This matches what CloudConvert does and turns the quota from a one-time stress point into a daily reason to come back.
- **Paid plans** bill monthly and flow into metered overage at $0.02/conversion **beyond** their included monthly amount.
- A **cost floor** protects against losses on heavy conversions: the actual amount due is `max(flatOverage, providerCost × 1.30)` — i.e. real Groq + Modal cost times a 1.30 (30%) markup. Implemented in `computeOverage()` in `lib/plans.js`.
- The cost model itself: `COST.groqInputPerMillionTokens = 0.11`, `COST.groqOutputPerMillionTokens = 0.34`, `COST.modalPerSecond = 0.0000131`, `COST.payoutMarkup = 1.30`.

### Provider-cost note (Modal accuracy caveat)

`modalMs` is a **wall-clock proxy** for Modal compute time, not a perfect bill. The dashboard uses it to show an accurate-enough breakdown; the real Modal invoice is the source of truth at payout. See `memory/pricing-model.md`.

---

## 9. Billing (Polar Merchant of Record)

Implemented in `lib/polar.js` and `convex/webhooks.ts` / `convex/plansActions.ts`. Architecture notes from `memory/polar-billing.md`:

- **Client passes the userId** through Polar's checkout `customer_external_id` and metadata. The webhook is the seam that ties a Polar subscription back to a Convex user — there is no email-matching fallback.
- **Layered idempotency:** the webhook is idempotent at the event-id level; runJob's usage ingestion is idempotent at the `prompts._id` level (gated by `prompts.billedToPolar`).
- **Inert until provisioned:** if the Polar env vars (`POLAR_*`) are absent, the entire billing surface is a no-op — the app still works and treats every user as Free. This means new dev environments don't accidentally hit Polar.
- **Regional product mapping:** `lib/plans.js` names the env var per (plan, region) pair (`POLAR_PRODUCT_STUDENT`, `POLAR_PRODUCT_STUDENT_IN`, etc.). `lib/polar.js` resolves those env vars at runtime.
- Setup details live in `POLAR_SETUP.md`.

---

## 10. Public REST API (developers)

Routes live under `/api/v1/*` (Next.js App Router). Authentication is `Authorization: Bearer rf_live_<...>`. Keys are issued in the Settings UI; **raw keys are shown once and never stored** — only `sha256(rawKey)` is kept, along with an 11-char prefix for display.

Per-user gate state lives in `apiUsage`. New users get a small free allowance; beyond that, `hasPaymentMethod` must be true (verified against Polar) before further jobs are accepted.

Submitting a job creates a `prompts` row with `source:"api"`. If the request includes a `webhookUrl`, a settlement POST is fired to that URL when the job completes (a Phase 3 action reads the column and dispatches).

---

## 11. Voice input

The composer accepts speech via the browser's `MediaRecorder` API. Audio is POSTed to a Next.js edge route that calls OpenAI Whisper. Supported transcription languages cover Indian linguistic diversity: **Hindi, Tamil, Telugu, Kannada, Malayalam, Marathi, Bengali, Gujarati, Punjabi, Urdu, and English**. Voice transcription is **optional** — the rest of the product works without `OPENAI_API_KEY`.

---

## 12. Crons & retention

Defined in `convex/crons.ts` (handlers in `convex/cleanup.ts`, `convex/cleanupHelpers.ts`, `convex/reviewFailures.ts`, `convex/reviewFailuresHelpers.ts`):

- **File cleanup** — uploaded inputs and produced outputs are deleted from Convex storage after 24 hours. The `prompts` row stays (history is preserved within the plan's `historyLimit`) and `filesExpired` is set to `true`. Share links keep their row but their `/d/{shortCode}` page renders "this file has expired".
- **Failure review** — clusters recent failures, distills lessons, files `learnedLessons` rows as pending.
- **Analytics rollup** — ~00:30 UTC daily, writes `eventDailyRollup` for the prior day.
- **Event pruning** — prunes raw `events` older than ~30 days.

---

## 13. Auth

Convex Auth with the Google OAuth provider. Callback URLs are owned by Convex, not Next.js:

- Dev: `https://acoustic-guanaco-615.convex.site/api/auth/callback/google`
- Prod: `https://cool-stork-372.convex.site/api/auth/callback/google`

The frontend has **no callback route of its own**. Sign-in failures are almost always either missing Google client credentials on the Convex deployment or a redirect URI not whitelisted in the Google Cloud Console.

---

## 14. Routes (Next.js App Router)

Selected routes under `src/app/`:

- `/` — landing page (features grid, capabilities-by-format cards, demo video, pricing CTA)
- `/convert` — the main composer + shell experience for one-off jobs
- `/dashboard` — usage meter (current period, conversions used / included, breakdown of provider cost), recent chats
- `/presets` — community + personal preset library
- `/workflow` — visual canvas to chain presets
- `/pricing` — region-aware pricing grid
- `/docs` — user-facing documentation (`lib/docs-nav.js` drives the sidebar)
- `/developers` — REST API docs, key management
- `/settings` — account, API keys, billing portal link
- `/admin` — admin-only: learned-lesson review queue, analytics dashboards
- `/d/{shortCode}` — public download page for a `shareLinks` row
- `/login`, `/security`, `/privacy`, `/terms`, `/status`, `/formats`, `/changelog`, `/community`

---

## 15. Environments & deployment

Two Convex deployments:

| Environment | Convex deployment | Frontend URL |
|---|---|---|
| Dev | `acoustic-guanaco-615` | `http://localhost:3000` |
| Prod | `cool-stork-372` | `https://refile-zeta.vercel.app` (or current production domain) |

### Required env vars

**Local `.env.local`:**

```
NEXT_PUBLIC_CONVEX_URL=https://acoustic-guanaco-615.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://acoustic-guanaco-615.convex.site
CONVEX_DEPLOYMENT=dev:acoustic-guanaco-615
NEXT_PUBLIC_APP_URL=http://localhost:3000
OPENAI_API_KEY=...        # optional, voice transcription only
```

**Convex deployment (dev or prod, via `npx convex env set [--prod] KEY value`):**

```
AUTH_GOOGLE_ID
AUTH_GOOGLE_SECRET
SITE_URL                  # http://localhost:3000 (dev) or production URL (prod)
GROQ_API_KEY              # gsk_... from console.groq.com
MODAL_WORKER_URL          # https://<workspace>--refile-worker-run.modal.run
MODAL_WORKER_TOKEN        # optional shared secret matching Modal's SECRET
POLAR_*                   # product ids, webhook secret, etc. — absent = billing inert
```

**Vercel (Production / Preview / Development):**

```
NEXT_PUBLIC_CONVEX_URL          # prod Convex cloud URL
NEXT_PUBLIC_CONVEX_SITE_URL     # prod Convex site URL (for auth redirects)
NEXT_PUBLIC_APP_URL             # production URL
OPENAI_API_KEY                  # optional
```

### Deploying

- Frontend → push to `main`, Vercel auto-deploys.
- Convex → `npx convex deploy` (or `--prod`).
- Modal worker → `modal deploy modal/worker.py`. Only needs redeploy when adding a new shell tool or upgrading a pinned dependency.

---

## 16. Common operational gotchas (from `SETUP.md` troubleshooting)

| Symptom | Cause |
|---|---|
| `Could not find Convex client` | `<ConvexClientProvider>` must wrap the app (it does in `src/app/layout.js`) |
| Sign-in does nothing | Google OAuth client/secret missing on Convex, or redirect URI not whitelisted |
| `Modal worker not configured` | `MODAL_WORKER_URL` not set on the Convex deployment |
| Modal returns 401 | `MODAL_WORKER_TOKEN` on Convex doesn't match Modal's `SECRET` |
| `GROQ_API_KEY is not set` | Must be set **on Convex**, not on Vercel |
| `X: command not found` inside Modal | Add `X` to `apt_install(...)` in `modal/worker.py` and redeploy |
| Prod auth works in dev but not prod | `SITE_URL` env on Convex prod must match the real production URL |
| ImageMagick refuses to read a PDF | Image build step strips the PDF/PS/EPS policy blocks — verify the `sed` lines ran |
| rembg crashes at startup with `ImportError: HfFolder` | `huggingface_hub` was upgraded past 0.25.2; re-pin and redeploy |

---

## 17. Glossary

- **Prompt** — one chat turn: user text + uploaded files + AI plan + execution result. Stored in `prompts`.
- **Chat** — a conversation session, ordered list of prompts. Stored in `chats`.
- **Preset** — a reusable recipe (name, description, command template, expected input/output patterns). Stored in `presets`. Can be private or public/community.
- **Workflow** — a visual canvas of chained presets/nodes. Stored in `workflows`.
- **Pipeline** — a multi-step `kind:"pipeline"` plan inside a single prompt. Each step is one shell command; only the last step's outputs survive.
- **Recipe book** — the hand-written collection of proven command forms baked into `SYSTEM_PROMPT` in `convex/prompts.ts`. Aligned with what the Modal image actually has installed.
- **Learned lesson** — a distilled instruction derived from clustered failures, appended to the system prompt once a human approves it.
- **Region** — pricing region; either `global` or `IN`. Quotas are identical across regions; only price differs.
- **Conversion** — one successful shell execution that produced ≥1 output file. The unit of metering and billing. A pipeline step counts as one conversion.
- **Failure kind** — coarse category in `prompts.failureKind`. The only failure signal the UI may act on.
- **Share link** — a 24-hour public download URL at `/d/{shortCode}` backed by a `shareLinks` row.
- **API key** — `rf_live_<...>` credential for the public REST API. Only the sha256 is stored.
