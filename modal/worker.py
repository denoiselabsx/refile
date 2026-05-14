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

# ─── Image: Debian + all shell tools we generate commands for ──────────────
image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install(
        "ffmpeg",
        "imagemagick",
        "qpdf",
        "ghostscript",
        "poppler-utils",
        "pandoc",
        "tesseract-ocr",
    )
    .pip_install("fastapi[standard]==0.115.0")
    # ImageMagick on Debian disables PDF/PS by default — re-enable.
    .run_commands(
        "sed -i 's|<policy domain=\"coder\" rights=\"none\" pattern=\"PDF\" />|<policy domain=\"coder\" rights=\"read|write\" pattern=\"PDF\" />|' /etc/ImageMagick-6/policy.xml || true"
    )
)

app = modal.App("refile-worker", image=image)

EXEC_TIMEOUT_SECS = 240  # 4 minutes upper bound


@app.function(
    image=image,
    timeout=EXEC_TIMEOUT_SECS + 60,
    cpu=2,
    memory=2048,
    secrets=[modal.Secret.from_name("refile-worker", required_keys=[])],
)
@modal.fastapi_endpoint(method="POST", label="run")
async def run(request):
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
