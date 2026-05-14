# ReFile setup guide

Two Convex deployments and one Vercel project. Each needs its own env vars.

| Layer | Where | What it powers |
|---|---|---|
| **Dev Convex** — `acoustic-guanaco-615` | `npx convex env set` | Local development backend |
| **Prod Convex** — `cool-stork-372` | Convex dashboard → Settings → Environment Variables, or `npx convex env set --prod` | Production backend |
| **Local frontend** | `.env.local` | `npm run dev` |
| **Vercel frontend** | Vercel project → Settings → Environment Variables | Production frontend |

---

## 0. Prerequisites

- Node 20+
- Convex CLI logged in: `npx convex login`
- Google Cloud OAuth client (web app)
- Groq API key — https://console.groq.com/keys
- Vercel token — https://vercel.com/account/tokens
- Vercel team ID + project ID (from team/project settings)
- _(optional)_ OpenAI API key for voice transcription

---

## 1. Local frontend (`.env.local`)

Already configured. For reference:

```env
# Convex (dev)
NEXT_PUBLIC_CONVEX_URL=https://acoustic-guanaco-615.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://acoustic-guanaco-615.convex.site
CONVEX_DEPLOYMENT=dev:acoustic-guanaco-615

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional
# OPENAI_API_KEY=
```

Run:

```bash
npm install
npx convex dev   # leave running — pushes /convex changes + regenerates types
npm run dev      # http://localhost:3000
```

---

## 2. Convex **dev** deployment env (`acoustic-guanaco-615`)

```bash
npx convex env set AUTH_GOOGLE_ID         "<google-oauth-client-id>"
npx convex env set AUTH_GOOGLE_SECRET     "<google-oauth-client-secret>"
npx convex env set SITE_URL               "http://localhost:3000"
npx convex env set GROQ_API_KEY           "gsk_..."
npx convex env set VERCEL_TOKEN           "<from vercel.com/account/tokens>"
npx convex env set VERCEL_TEAM_ID         "<your team id>"
npx convex env set VERCEL_PROJECT_ID      "<your project id>"
```

Verify: `npx convex env list`

---

## 3. Convex **prod** deployment env (`cool-stork-372`)

You can set these via the dashboard (the page you have open right now — click **Add** under Environment Variables) **or** via the CLI with `--prod`:

```bash
npx convex env set --prod AUTH_GOOGLE_ID         "<google-oauth-client-id>"
npx convex env set --prod AUTH_GOOGLE_SECRET     "<google-oauth-client-secret>"
npx convex env set --prod SITE_URL               "https://refile-zeta.vercel.app"
npx convex env set --prod GROQ_API_KEY           "gsk_..."
npx convex env set --prod VERCEL_TOKEN           "<from vercel.com/account/tokens>"
npx convex env set --prod VERCEL_TEAM_ID         "<your team id>"
npx convex env set --prod VERCEL_PROJECT_ID      "<your project id>"
```

**Important:**
- `SITE_URL` for prod must be the real production URL (the one Vercel serves your frontend at). Swap `refile-zeta.vercel.app` for your actual one if it's different.
- The same Google OAuth Client ID/Secret works for both dev and prod, **but only if you list both redirect URIs in Google Console** (see § 5).
- Use **separate** Vercel tokens / Groq keys for prod if you want clean billing separation; otherwise reuse the dev ones.

Verify: `npx convex env list --prod`

---

## 4. Vercel frontend env

Vercel → `refile` project → Settings → **Environment Variables** → add each row. Set environments to **Production, Preview, Development** unless noted.

| Key | Value |
|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | `https://cool-stork-372.convex.cloud` |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | `https://cool-stork-372.convex.site` |
| `NEXT_PUBLIC_APP_URL` | `https://refile-zeta.vercel.app` _(your actual prod URL)_ |
| `CONVEX_DEPLOY_KEY` | _(optional)_ a [deploy key](https://docs.convex.dev/production/hosting/vercel) if you want `vercel build` to run `convex deploy` automatically |
| `OPENAI_API_KEY` | _(optional)_ for voice transcription |

After adding: **Redeploy** the latest build (Deployments → ⋯ → Redeploy → uncheck "Use existing Build Cache").

---

## 5. Google OAuth setup

In https://console.cloud.google.com/apis/credentials → your OAuth 2.0 Client:

**Authorized JavaScript origins:**
- `http://localhost:3000`
- `https://refile-zeta.vercel.app` _(or your production URL)_

**Authorized redirect URIs** — Convex Auth needs **both** the dev and prod callback endpoints:
- `https://acoustic-guanaco-615.convex.site/api/auth/callback/google` _(dev)_
- `https://cool-stork-372.convex.site/api/auth/callback/google` _(prod)_

---

## 6. Vercel Sandbox setup

Used by Convex actions for running shell tools (ffmpeg, magick, etc.).

1. https://vercel.com/account/tokens → **Create Token** → scope: full account → save it
2. Team ID: Vercel → your team → Settings → "Team ID" near the top
3. Project ID: Vercel → `refile` project → Settings → "Project ID"

Set all three on **both** Convex deployments (commands above).

---

## 7. Deploy

```bash
# Push Convex functions to production
npx convex deploy

# Push frontend (auto-deploys via Vercel)
git push
```

---

## Quick reference — copy-paste env templates

### `.env.local`

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

### Convex prod env (add via dashboard or `--prod` flag)

```
AUTH_GOOGLE_ID
AUTH_GOOGLE_SECRET
SITE_URL                        https://refile-zeta.vercel.app
GROQ_API_KEY
VERCEL_TOKEN
VERCEL_TEAM_ID
VERCEL_PROJECT_ID
```

### Convex dev env (same keys, dev values)

```
AUTH_GOOGLE_ID                  <same client id as prod>
AUTH_GOOGLE_SECRET              <same client secret as prod>
SITE_URL                        http://localhost:3000
GROQ_API_KEY                    <can be same or different>
VERCEL_TOKEN                    <can be same or different>
VERCEL_TEAM_ID                  <same>
VERCEL_PROJECT_ID               <same>
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Could not find Convex client` | `<ConvexClientProvider>` must wrap the app (it does in `layout.js`) |
| Sign-in does nothing | OAuth Client/Secret missing OR redirect URI not whitelisted in Google Console |
| `Sandbox credentials missing` | `VERCEL_TOKEN`/`VERCEL_TEAM_ID`/`VERCEL_PROJECT_ID` not set on Convex |
| `GROQ_API_KEY is not set` | Set it on Convex deployment, not on Vercel |
| Files won't upload | `NEXT_PUBLIC_CONVEX_URL` wrong or Convex deployment unreachable |
| Prod auth works in dev but not prod | `SITE_URL` env on Convex prod must match your real production URL |
