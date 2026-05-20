import { absoluteUrl } from "@/lib/site";
import {
  DocHeader,
  DocSection,
  DocCode,
  DocList,
  DocCallout,
} from "@/components/docs/doc-parts";

export const metadata = {
  title: "API reference — Docs",
  description:
    "ReFile's REST API lets you submit natural-language file operations from any backend. POST a prompt + files; get the result.",
  alternates: { canonical: absoluteUrl("/docs/api") },
};

const BASE = "https://refile.denoiselabs.com/api/v1";

const CURL_EXAMPLE = `# 1. Get an upload URL
curl -X POST ${BASE}/uploads \\
  -H "Authorization: Bearer rf_live_..."

# response: { "uploadUrl": "...", "expiresInSeconds": 1800 }

# 2. Upload the file directly to that URL
curl -X POST "$UPLOAD_URL" \\
  -H "Content-Type: video/mp4" \\
  --data-binary @input.mp4

# response: { "storageId": "kg2..." }

# 3. Submit the job (sync — waits up to 25s for the result)
curl -X POST '${BASE}/jobs?wait=true' \\
  -H "Authorization: Bearer rf_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Compress this so it can be emailed.",
    "files": [{"storageId":"kg2...","filename":"input.mp4"}]
  }'

# 4. Or poll for the result later
curl ${BASE}/jobs/<job_id> \\
  -H "Authorization: Bearer rf_live_..."`;

const NODE_EXAMPLE = `// Node 20+ — uses built-in fetch and fs.
import fs from "node:fs/promises";

const API_KEY = process.env.REFILE_API_KEY;
const BASE = "${BASE}";

async function api(path, init = {}) {
  const res = await fetch(\`\${BASE}\${path}\`, {
    ...init,
    headers: {
      Authorization: \`Bearer \${API_KEY}\`,
      ...(init.headers || {}),
    },
  });
  if (!res.ok) throw new Error(\`\${res.status} \${await res.text()}\`);
  return res.json();
}

// 1. Get an upload URL.
const { uploadUrl } = await api("/uploads", { method: "POST" });

// 2. PUT the bytes to that URL (no auth header needed — it's a signed URL).
const bytes = await fs.readFile("input.mp4");
const up = await fetch(uploadUrl, {
  method: "POST",
  headers: { "Content-Type": "video/mp4" },
  body: bytes,
});
const { storageId } = await up.json();

// 3. Submit the job and wait for it.
const job = await api("/jobs?wait=true", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    prompt: "Compress this so it can be emailed.",
    files: [{ storageId, filename: "input.mp4" }],
  }),
});

console.log(job.status, job.outputs);`;

const PYTHON_EXAMPLE = `# Python 3.9+ with the requests library.
import os
import requests

API_KEY = os.environ["REFILE_API_KEY"]
BASE = "${BASE}"
HEADERS = {"Authorization": f"Bearer {API_KEY}"}

# 1. Get an upload URL.
r = requests.post(f"{BASE}/uploads", headers=HEADERS)
r.raise_for_status()
upload_url = r.json()["uploadUrl"]

# 2. Upload the file bytes.
with open("input.mp4", "rb") as f:
    up = requests.post(
        upload_url,
        headers={"Content-Type": "video/mp4"},
        data=f.read(),
    )
up.raise_for_status()
storage_id = up.json()["storageId"]

# 3. Submit the job (wait=true blocks up to 25 seconds).
r = requests.post(
    f"{BASE}/jobs?wait=true",
    headers={**HEADERS, "Content-Type": "application/json"},
    json={
        "prompt": "Compress this so it can be emailed.",
        "files": [{"storageId": storage_id, "filename": "input.mp4"}],
    },
)
r.raise_for_status()
job = r.json()
print(job["status"], job["outputs"])`;

const JOB_SHAPE = `{
  "id": "string",
  "chat_id": "string | null",
  "status": "pending | generating | running | succeeded | failed",
  "description": "string | null",
  "kind": "command | chat | null",
  "message": "string | null   // set when kind == 'chat'",
  "input_files": ["string"],
  "outputs": [
    { "storageId": "string", "filename": "string", "url": "string | null" }
  ],
  "pipeline": [
    { "description": "string", "status": "pending | running | completed | failed" }
  ] | null,
  "files_expired": "boolean",
  "created_at": "number  // unix ms",
  "error": { "code": "string", "message": "string" } | null
}`;

const ERRORS = [
  ["unauthorized", "401", "Missing or invalid API key."],
  ["invalid_request", "400", "Bad input (validation failed)."],
  ["not_found", "404", "Job id not found, or not yours."],
  ["quota_exceeded", "402", "Plan limits exceeded."],
  [
    "rate_limited",
    "429",
    "Too many requests. A Retry-After header is set.",
  ],
  [
    "unprocessable_request",
    "200 (with error body)",
    "Job ran but the prompt was too complex.",
  ],
  [
    "no_output",
    "200 (with error body)",
    "Job ran but produced no output file.",
  ],
  [
    "execution_failed",
    "200 (with error body)",
    "Job ran but the file failed processing.",
  ],
  ["internal_error", "500", "Service problem. Retry."],
];

export default function Page() {
  return (
    <>
      <DocHeader
        eyebrow="Developers"
        title="API reference"
        intro="ReFile's REST API lets you submit natural-language file operations from any backend. POST a prompt and some files, get the finished result. Same engine as the web app."
      />

      <DocSection title="Authentication">
        <p>
          Create a key from the{" "}
          <a
            href="/settings/api"
            className="text-foreground underline-offset-4 hover:underline"
          >
            API keys page
          </a>
          . Send it on every request as a bearer token:
        </p>
        <DocCode>{`Authorization: Bearer rf_live_...`}</DocCode>
        <DocCallout tone="warn">
          Never expose API keys in client-side code, mobile apps, or public
          repositories. They are server-side credentials — anyone with the
          key can run jobs against your account.
        </DocCallout>
      </DocSection>

      <DocSection title="Base URL">
        <p>All endpoints are rooted at:</p>
        <DocCode>{BASE}</DocCode>
        <p>
          Requests must be HTTPS. Responses are JSON unless noted otherwise.
        </p>
      </DocSection>

      <DocSection title="Quick start">
        <p>
          The end-to-end flow is four steps: ask for an upload URL, PUT the
          file to that URL, create a job, then either long-poll or fetch the
          job later. Examples below show all four.
        </p>

        <p className="mt-4 text-[12.5px] font-semibold uppercase tracking-wider text-muted-foreground">
          curl
        </p>
        <DocCode>{CURL_EXAMPLE}</DocCode>

        <p className="mt-4 text-[12.5px] font-semibold uppercase tracking-wider text-muted-foreground">
          Node (fetch)
        </p>
        <DocCode>{NODE_EXAMPLE}</DocCode>

        <p className="mt-4 text-[12.5px] font-semibold uppercase tracking-wider text-muted-foreground">
          Python (requests)
        </p>
        <DocCode>{PYTHON_EXAMPLE}</DocCode>
      </DocSection>

      <DocSection title="Endpoints">
        <h3 className="mt-2 font-mono text-[14px] font-semibold text-foreground">
          POST /api/v1/uploads
        </h3>
        <DocList
          items={[
            "Auth: required.",
            "Body: none.",
            "Returns: { uploadUrl: string, expiresInSeconds: number }.",
            "The client then POSTs the raw file bytes to uploadUrl. The storage layer returns { storageId }, which you pass into the job.",
          ]}
        />

        <h3 className="mt-6 font-mono text-[14px] font-semibold text-foreground">
          POST /api/v1/jobs
        </h3>
        <DocList
          items={[
            "Auth: required.",
            "Query: ?wait=true to long-poll up to 25 seconds for completion. Omit it to return immediately with status=pending.",
          ]}
        />
        <p className="mt-3 text-[13px] text-muted-foreground">Request body:</p>
        <DocCode>{`{
  "prompt": "string  (1-2000 chars)",
  "files": [
    { "storageId": "string", "filename": "string" }
  ],
  "chat_id":     "string  (optional — group jobs into a single thread)",
  "webhook_url": "string  (optional — http/https, called when the job settles)"
}`}</DocCode>
        <p className="mt-2 text-[13px] text-muted-foreground">
          Returns the job object (see below).
        </p>

        <h3 className="mt-6 font-mono text-[14px] font-semibold text-foreground">
          GET /api/v1/jobs/:id
        </h3>
        <DocList
          items={[
            "Auth: required.",
            "Returns the same job shape. Use this to poll, or to look up a job you created with webhook_url.",
          ]}
        />
      </DocSection>

      <DocSection title="Job shape">
        <p>Every job endpoint returns the same object:</p>
        <DocCode>{JOB_SHAPE}</DocCode>
        <p className="text-[13px] text-muted-foreground">
          For multi-step jobs, <code className="text-mono">pipeline</code> is
          populated with one entry per step. Output{" "}
          <code className="text-mono">url</code> is a short-lived signed
          download link — fetch it within the 24-hour retention window or
          your client will see <code className="text-mono">files_expired</code>{" "}
          set to <code className="text-mono">true</code>.
        </p>
      </DocSection>

      <DocSection title="Error codes">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Code</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 font-medium">Meaning</th>
              </tr>
            </thead>
            <tbody>
              {ERRORS.map(([code, status, meaning]) => (
                <tr
                  key={code}
                  className="border-b border-border/60 text-foreground/85"
                >
                  <td className="py-2.5 pr-3 font-mono text-foreground">
                    {code}
                  </td>
                  <td className="py-2.5 pr-3">{status}</td>
                  <td className="py-2.5">{meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[13px] text-muted-foreground">
          Failures with an HTTP 200 status come back as a normal job object
          whose <code className="text-mono">status</code> is{" "}
          <code className="text-mono">failed</code> and whose{" "}
          <code className="text-mono">error</code> field is populated. This
          mirrors the web app: the request was processed, but the work
          itself didn&apos;t succeed.
        </p>
      </DocSection>

      <DocSection title="Webhooks">
        <p>
          Provide <code className="text-mono">webhook_url</code> on job
          creation and ReFile will POST the full job object to that URL once
          the job settles (succeeded or failed). The body is identical to
          what <code className="text-mono">GET /jobs/:id</code> returns.
        </p>
        <p className="mt-3 text-[13px] text-muted-foreground">
          Delivery headers:
        </p>
        <DocCode>{`Content-Type:        application/json
X-Refile-Event:      job.settled
X-Refile-Delivery:   <uuid>
X-Refile-Signature:  sha256=<hex>`}</DocCode>
        <DocCallout>
          The body is signed with HMAC-SHA256 over the raw request body, in
          the form <code className="text-mono">sha256=&lt;hex&gt;</code>.
          Self-serve signature verification is opt-in and coming soon —
          contact support if you need the verification secret today. Until
          then, treat the webhook as a delivery hint and re-fetch{" "}
          <code className="text-mono">GET /jobs/:id</code> to confirm state
          before acting on it.
        </DocCallout>
      </DocSection>

      <DocSection title="Next steps">
        <DocList
          items={[
            "Create your first API key on /settings/api.",
            "Review API pricing on /pricing — pay-as-you-go, no monthly commitment.",
          ]}
        />
        <p>
          <a
            href="/settings/api"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Create an API key
          </a>{" "}
          ·{" "}
          <a
            href="/pricing"
            className="text-foreground underline-offset-4 hover:underline"
          >
            See API pricing
          </a>
        </p>
      </DocSection>
    </>
  );
}
