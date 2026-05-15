"""
ReFile Modal worker — runs shell commands against uploaded files in an
ephemeral container with ffmpeg, imagemagick, qpdf, ghostscript, poppler,
pandoc, and tesseract preinstalled.

Quick start:
    pip install modal
    modal token new                       # one-time, opens browser
    modal deploy modal/worker.py
    # Modal prints a URL like:
    #   https://<workspace>--refile-worker-run.modal.run

Set that URL on your Convex deployments:
    npx convex env set        MODAL_WORKER_URL https://...
    npx convex env set --prod MODAL_WORKER_URL https://...

(Optional) Add a shared secret so only your Convex deployment can call the
endpoint:
    # On Modal:
    modal secret create refile-worker SECRET=$(openssl rand -hex 32)
    # Then on Convex:
    npx convex env set        MODAL_WORKER_TOKEN <the-secret>
    npx convex env set --prod MODAL_WORKER_TOKEN <the-secret>
"""
from __future__ import annotations

import base64
import json
import os
import subprocess
import tempfile
from pathlib import Path

import modal
from fastapi import Request

# ─── Image: Debian + all shell tools we generate commands for ──────────────
#
# Tool groups (kept aligned with the recipe book in convex/runJob.ts):
#   core media:   ffmpeg, imagemagick, sox, lame, opus-tools, mkvtoolnix
#   documents:    pandoc, libreoffice (headless), wkhtmltopdf, antiword, catdoc, pdftotext
#   pdf:          qpdf, ghostscript, poppler-utils
#   images++ :    webp, libheif-examples (heif-convert), libavif-bin, librsvg2-bin, exiftool
#   ocr:          tesseract-ocr (+ extra langs)
#   archives:     zip, unzip, p7zip-full, xz-utils, bzip2, gzip, tar (coreutils)
#   data:         jq, csvkit (via pip), xmlstarlet
image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install(
        # core media
        "ffmpeg",
        "imagemagick",
        "sox",
        "libsox-fmt-all",
        "lame",
        "opus-tools",
        "mkvtoolnix",
        # documents
        "pandoc",
        "libreoffice",
        "wkhtmltopdf",
        "antiword",
        "catdoc",
        # pdf
        "qpdf",
        "ghostscript",
        "poppler-utils",
        # images++
        "webp",
        "libheif-examples",  # heif-convert, heif-info
        "libavif-bin",       # avifenc, avifdec
        "librsvg2-bin",      # rsvg-convert
        "libimage-exiftool-perl",  # exiftool
        # ocr (+ a few common extra languages — add more if needed)
        "tesseract-ocr",
        "tesseract-ocr-eng",
        "tesseract-ocr-hin",
        "tesseract-ocr-osd",
        # archives
        "zip",
        "unzip",
        "p7zip-full",
        "xz-utils",
        "bzip2",
        "gzip",
        # data
        "jq",
        "xmlstarlet",
    )
    .pip_install(
        "fastapi[standard]==0.115.0",
        "csvkit==1.3.0",  # csvkit -> csvcut, csvjson, in2csv, etc.
        # AI background removal. `rembg[cli]` installs the `rembg` console
        # script, so the recipe book can call `rembg i in.jpg out.png`
        # without invoking python directly (python is blocked by the
        # Convex command validator). onnxruntime is the CPU inference
        # backend — matches the cpu=2 worker config below.
        "rembg[cli]==2.0.59",
        "onnxruntime==1.19.2",
    )
    # ImageMagick on Debian disables PDF/PS/EPS by default for security.
    # Re-enable them by stripping policy lines that block these coders.
    # Also alias `magick` → `convert` so IM7-style commands work on IM6.
    .run_commands(
        "sed -i '/policy domain=\"coder\".*pattern=\"PDF\"/d' /etc/ImageMagick-6/policy.xml || true",
        "sed -i '/policy domain=\"coder\".*pattern=\"PS\"/d' /etc/ImageMagick-6/policy.xml || true",
        "sed -i '/policy domain=\"coder\".*pattern=\"EPS\"/d' /etc/ImageMagick-6/policy.xml || true",
        "sed -i '/policy domain=\"coder\".*pattern=\"XPS\"/d' /etc/ImageMagick-6/policy.xml || true",
        "ln -sf /usr/bin/convert /usr/local/bin/magick",
        # Bake the rembg u2net model (~170MB) into the image at build time.
        # If we skip this, rembg downloads it on every cold start and we pay
        # for that wall-clock time on each invocation. Baking it in means the
        # model is already on disk — zero runtime download, predictable cost.
        # U2NET_HOME must match the path rembg reads at runtime (set via the
        # function env below).
        "mkdir -p /models/u2net",
        "U2NET_HOME=/models/u2net python -m rembg d u2net",
    )
    # Persist the model path into the container env so the `rembg` CLI finds
    # the baked-in model at runtime instead of downloading it.
    .env({"U2NET_HOME": "/models/u2net"})
)

app = modal.App("refile-worker", image=image)

EXEC_TIMEOUT_SECS = 240  # 4 minutes upper bound


# Cost controls (Modal free credits ≈ $30/mo — we want to stay well under):
#   - scaledown_window=60: kill idle containers after 60s instead of the
#     default 300s. Bursty per-conversion traffic means a container would
#     otherwise sit warm-but-idle for 5 min after each job, billing CPU/memory
#     the whole time. 60s keeps a little warmth for back-to-back requests
#     without paying for 5 minutes of nothing.
#   - max_containers=4: hard ceiling on concurrency so a traffic spike (or a
#     retry storm) can't silently fan out and drain the monthly credits.
#   - U2NET_HOME points rembg at the model baked into the image at build
#     time, so no per-invocation model download.
@app.function(
    image=image,
    timeout=EXEC_TIMEOUT_SECS + 60,
    cpu=2,
    memory=2048,
    scaledown_window=60,
    max_containers=4,
    secrets=[modal.Secret.from_name("refile-worker", required_keys=[])],
)
@modal.fastapi_endpoint(method="POST", label="run")
async def run(request: Request):
    """
    HTTP POST entrypoint. Accepts multipart/form-data:

        command:           the shell command string to execute
        expected_outputs:  JSON-encoded list of filenames to collect
        files:             one or more file fields (the input files)

    Returns JSON:
        {
          "exit_code": int,
          "stdout":    str,
          "stderr":    str,
          "outputs":   [{"filename": str, "content_base64": str}, ...]
        }
    """
    from fastapi import HTTPException
    from fastapi.responses import JSONResponse

    # Optional shared-secret check
    expected_secret = os.environ.get("SECRET")
    if expected_secret:
        provided = request.headers.get("authorization", "")
        if provided != f"Bearer {expected_secret}":
            raise HTTPException(status_code=401, detail="Unauthorized")

    form = await request.form()
    command = form.get("command")
    expected_outputs_raw = form.get("expected_outputs", "[]")
    if not command:
        raise HTTPException(status_code=400, detail="missing command")
    try:
        expected_outputs = json.loads(expected_outputs_raw)
        if not isinstance(expected_outputs, list):
            raise ValueError
    except Exception:
        raise HTTPException(
            status_code=400, detail="expected_outputs must be JSON list"
        )

    uploads = form.getlist("files")
    if not uploads:
        raise HTTPException(status_code=400, detail="at least one file required")

    with tempfile.TemporaryDirectory(prefix="refile-") as workdir:
        for upload in uploads:
            filename = upload.filename
            if not filename or "/" in filename or filename.startswith("."):
                raise HTTPException(
                    status_code=400, detail=f"bad filename {filename!r}"
                )
            dest = Path(workdir) / filename
            dest.write_bytes(await upload.read())

        proc = subprocess.run(
            ["bash", "-lc", command],
            cwd=workdir,
            capture_output=True,
            timeout=EXEC_TIMEOUT_SECS,
        )
        stdout = (proc.stdout or b"").decode("utf-8", errors="replace")
        stderr = (proc.stderr or b"").decode("utf-8", errors="replace")
        exit_code = proc.returncode

        outputs = []
        for name in expected_outputs:
            safe = Path(name).name  # strip any directory components
            path = Path(workdir) / safe
            if not path.exists():
                continue
            data = path.read_bytes()
            outputs.append(
                {
                    "filename": safe,
                    "content_base64": base64.b64encode(data).decode("ascii"),
                }
            )

        return JSONResponse(
            {
                "exit_code": exit_code,
                "stdout": stdout[-8000:],
                "stderr": stderr[-8000:],
                "outputs": outputs,
            }
        )
