# ReFile

AI-native file automation. Describe what you want, drop the file, get the exact shell command — and the result.

A [Denoise Labs](https://denoiselabs.com) product.

## Stack

- **Next.js 16** (App Router) + **React 19** + **Tailwind CSS 4**
- **Convex** — database, auth, realtime, file storage, server-side functions
- **Vercel Sandbox** — ephemeral microVMs for running `ffmpeg`, `imagemagick`, `qpdf`, etc. on uploaded files
- **Groq** — Llama 3.1 70B for natural-language → shell-command generation
- **OpenAI Whisper** — voice transcription (optional, runs on a Next.js edge route)

## Repo layout

```
/                      Next.js app
├── src/app/           Routes (App Router)
├── src/components/    UI components + composer + shell
├── src/contexts/      React contexts (auth)
├── convex/            Convex backend — schema, queries, mutations, actions
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
GROQ_API_KEY=<from console.groq.com>
VERCEL_TOKEN=<from vercel.com/account/tokens>
VERCEL_TEAM_ID=<from vercel.com team settings>
VERCEL_PROJECT_ID=<from project settings>
```

## Deployment

Frontend deploys to Vercel automatically on push to `main`.
Convex deploys with `npx convex deploy`.

## License

MIT
