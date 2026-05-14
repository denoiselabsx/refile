# ReFile setup guide

Three services, two environments. Everything below assumes a free-tier
account on each (no paid plans required).

| Service | What it does | Tier |
|---|---|---|
| **Convex** | DB, auth, file storage, server functions | Free |
| **Modal** | Runs the AI-generated shell commands (ffmpeg, magick, …) | Free (~$30/mo credit) |
| **Vercel** | Hosts the Next.js frontend | Hobby (free) |
| **Groq** | LLM that generates the commands | Free |
| **Google Cloud** | OAuth provider for sign-in | Free |
| _(optional)_ **OpenAI** | Whisper voice transcription | $$ |

---

## Deployments at a glance

```
Frontend (Vercel)
   │
   ├─ talks to ─►  Convex (acoustic-guanaco-615 dev / cool-stork-372 prod)
   │                  │
   │                  ├─ stores files + metadata
   │                  ├─ calls Groq for command generation
   │                  └─ calls Modal to execute the command
   │
   └─ (Modal worker runs ffmpeg/magick/etc. in an ephemeral container)
```

---

## 0. Prerequisites

- Node 20+
- Python 3.10+ (for `modal` CLI)
- Convex CLI logged in: `npx convex login`
- A Google OAuth web client (Client ID + Secret)
- A Groq key from https://console.groq.com/keys

---

## 1. Local frontend

`.env.local` is already set up:

```env
NEXT_PUBLIC_CONVEX_URL=https://acoustic-guanaco-615.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://acoustic-guanaco-615.convex.site
CONVEX_DEPLOYMENT=dev:acoustic-guanaco-615
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

```bash
npm install
npx convex dev      # leave running — pushes /convex changes + regenerates types
npm run dev         # http://localhost:3000
```

---

## 2. Deploy the Modal worker

This is the compute layer. It only needs to be deployed once (and re-deployed
whenever you add a new shell tool).

```bash
pip install modal
modal token new        # opens browser to log in
modal deploy modal/worker.py
```

Modal prints a URL like:

```
https://<your-workspace>--refile-worker-run.modal.run
```

Keep that URL handy — you'll set it on both Convex deployments next.

(Optional) Lock it down to your Convex backend only:

```bash
modal secret create refile-worker SECRET=$(openssl rand -hex 32)
modal deploy modal/worker.py   # picks up the secret
```

See [modal/README.md](./modal/README.md) for more.

---

## 3. Convex **dev** deployment env (`acoustic-guanaco-615`)

```bash
npx convex env set AUTH_GOOGLE_ID         "<google-oauth-client-id>"
npx convex env set AUTH_GOOGLE_SECRET     "<google-oauth-client-secret>"
npx convex env set SITE_URL               "http://localhost:3000"
npx convex env set GROQ_API_KEY           "gsk_..."
npx convex env set MODAL_WORKER_URL       "https://<your-workspace>--refile-worker-run.modal.run"
# Optional, if you set a shared secret on the Modal worker:
npx convex env set MODAL_WORKER_TOKEN     "<that-secret>"
```

Verify: `npx convex env list`

---

## 4. Convex **prod** deployment env (`cool-stork-372`)

Add via the dashboard you have open (Settings → Environment Variables → Add)
**or** via the CLI with `--prod`:

```bash
npx convex env set --prod AUTH_GOOGLE_ID         "<same-google-oauth-client-id>"
npx convex env set --prod AUTH_GOOGLE_SECRET     "<same-google-oauth-client-secret>"
npx convex env set --prod SITE_URL               "https://refile-zeta.vercel.app"
npx convex env set --prod GROQ_API_KEY           "gsk_..."
npx convex env set --prod MODAL_WORKER_URL       "https://<your-workspace>--refile-worker-run.modal.run"
npx convex env set --prod MODAL_WORKER_TOKEN     "<that-secret>"   # if used
```

Verify: `npx convex env list --prod`

Replace `refile-zeta.vercel.app` with your actual production URL.

---

## 5. Google OAuth setup

In https://console.cloud.google.com/apis/credentials → your OAuth 2.0 Client
(create one if you don't have it):

**Authorized JavaScript origins:**

- `http://localhost:3000`
- `https://refile-zeta.vercel.app`

**Authorized redirect URIs:**

- `https://acoustic-guanaco-615.convex.site/api/auth/callback/google`
- `https://cool-stork-372.convex.site/api/auth/callback/google`

Convex Auth handles the OAuth dance — your frontend doesn't have its own
callback URL.

---

## 6. Vercel frontend env

Vercel → `refile` project → Settings → **Environment Variables**.
Apply to **Production, Preview, Development**:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | `https://cool-stork-372.convex.cloud` |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | `https://cool-stork-372.convex.site` |
| `NEXT_PUBLIC_APP_URL` | your production URL |
| `OPENAI_API_KEY` _(optional)_ | for voice transcription |

After adding: **Redeploy** the latest build (Deployments → ⋯ → Redeploy →
uncheck "Use existing Build Cache").

---

## 7. Push everything

```bash
# Convex functions to production
npx convex deploy

# Frontend (Vercel auto-deploys)
git push
```

---

## Quick reference

### Local `.env.local`

```env
NEXT_PUBLIC_CONVEX_URL=https://acoustic-guanaco-615.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://acoustic-guanaco-615.convex.site
CONVEX_DEPLOYMENT=dev:acoustic-guanaco-615
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Vercel frontend env

```
NEXT_PUBLIC_CONVEX_URL          https://cool-stork-372.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL     https://cool-stork-372.convex.site
NEXT_PUBLIC_APP_URL             https://refile-zeta.vercel.app
```

### Convex **prod** env (`cool-stork-372`)

```
AUTH_GOOGLE_ID
AUTH_GOOGLE_SECRET
SITE_URL                        https://refile-zeta.vercel.app
GROQ_API_KEY
MODAL_WORKER_URL                https://<workspace>--refile-worker-run.modal.run
MODAL_WORKER_TOKEN              (optional, if you set the shared secret)
```

### Convex **dev** env (`acoustic-guanaco-615`)

Same keys, with `SITE_URL=http://localhost:3000`. Other values can be
reused from prod.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Could not find Convex client` | `<ConvexClientProvider>` must wrap the app (it does in `layout.js`) |
| Sign-in does nothing | OAuth Client/Secret missing OR redirect URI not whitelisted in Google Console |
| `Modal worker not configured` | Set `MODAL_WORKER_URL` on Convex deployment |
| Modal returns 401 | `MODAL_WORKER_TOKEN` on Convex doesn't match the Modal secret |
| `GROQ_API_KEY is not set` | Set it on Convex deployment, not on Vercel |
| Command fails inside Modal with "X: command not found" | Add `X` to `apt_install(...)` in `modal/worker.py` and redeploy |
| Prod auth works in dev but not prod | `SITE_URL` env on Convex prod must match your real production URL |
