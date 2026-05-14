# ReFile

AI-native file automation. Describe what you want, drop the file, get the exact shell command — and the result.

A [Denoise Labs](https://denoiselabs.com) product.

## Stack

- **Next.js 16** (App Router) + **React 19** + **Tailwind CSS 4**
- **Convex** — database, auth, realtime, file storage, server-side functions
- **Modal** — ephemeral container worker that runs `ffmpeg`, `imagemagick`, `qpdf`, etc. on uploaded files (free tier)
- **Groq** — Llama 3.1 70B for natural-language → shell-command generation
- **OpenAI Whisper** — voice transcription (optional, runs on a Next.js edge route)

## Repo layout

```
/                      Next.js app
├── src/app/           Routes (App Router)
├── src/components/    UI components + composer + shell
├── src/contexts/      React contexts (auth)
├── convex/            Convex backend — schema, queries, mutations, actions
├── modal/             Modal worker (Python) that runs shell commands
└── public/            Static assets
```

## Local development

```bash
npm install
npx convex dev          # logs into Convex, creates a deployment, writes NEXT_PUBLIC_CONVEX_URL
npm run dev             # http://localhost:3000
```

## Environment variables

Local `.env.local`:

```
NEXT_PUBLIC_CONVEX_URL=<from `npx convex dev`>
NEXT_PUBLIC_APP_URL=http://localhost:3000
OPENAI_API_KEY=<optional; only needed if you want voice transcription>
```

Convex deployment (set via `npx convex env set <KEY> <value>`):

```
AUTH_GOOGLE_ID=<Google OAuth client id>
AUTH_GOOGLE_SECRET=<Google OAuth client secret>
SITE_URL=<frontend URL — http://localhost:3000 for dev>
GROQ_API_KEY=<from console.groq.com>
MODAL_WORKER_URL=<https://...modal.run, after `modal deploy modal/worker.py`>
MODAL_WORKER_TOKEN=<optional shared secret>
```

See [SETUP.md](./SETUP.md) for the full step-by-step.

## Deployment

Frontend deploys to Vercel automatically on push to `main`.
Convex deploys with `npx convex deploy`.

## License

MIT
