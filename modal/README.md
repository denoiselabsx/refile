# Modal worker

A small FastAPI endpoint running on [Modal](https://modal.com) that executes the
shell command produced by ReFile's AI against the uploaded files.

Why a separate compute service? Convex actions can't spawn shell processes
(`ffmpeg`, `imagemagick`, etc.). Modal gives us an ephemeral container with all
the tools preinstalled, runs the command, and returns the outputs.

## Free tier

Modal includes ~$30/mo of free compute on signup — no card required.
For ReFile's bursty per-conversion workload, that's plenty for personal use.

## Deploy

```bash
pip install modal
modal token new            # one-time: opens a browser to log in
modal deploy modal/worker.py
```

Modal will print a URL like:

```
https://<your-workspace>--refile-worker-run.modal.run
```

Use that URL when setting `MODAL_WORKER_URL` on Convex.

## Optional: shared-secret auth

By default the endpoint is public (anyone with the URL can hit it).
To lock it down to your Convex deployment only:

```bash
# 1. Generate a random secret and store it in Modal
modal secret create refile-worker SECRET=$(openssl rand -hex 32)

# 2. Redeploy so the function picks up the secret
modal deploy modal/worker.py

# 3. Tell Convex about the same secret
npx convex env set         MODAL_WORKER_TOKEN <the-secret>
npx convex env set --prod  MODAL_WORKER_TOKEN <the-secret>
```

Convex sends it as `Authorization: Bearer <token>` and the worker rejects
anything else.

## What it can run

Pre-installed in the container:

| Tool | What for |
|---|---|
| `ffmpeg` | video + audio transcoding, extraction, cuts |
| `magick` (ImageMagick 6) | image resize/convert/composite |
| `qpdf` | PDF merge, split, password ops |
| `gs` (Ghostscript) | PDF compression, rasterization |
| `pdftoppm`, `pdftocairo` (Poppler) | PDF → images |
| `pandoc` | document format conversion |
| `tesseract` | OCR |

If the AI generates a command using a tool that isn't in this list,
the command will fail with `command not found`. Add the package to the
`apt_install(...)` call in `worker.py` and redeploy.

## Local testing

```bash
modal serve modal/worker.py
# Then point MODAL_WORKER_URL at the tmp URL Modal prints
```
