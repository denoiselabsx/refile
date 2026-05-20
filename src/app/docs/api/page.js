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
    "Submit natural-language file operations from any backend. Same engine as the web app.",
  alternates: { canonical: absoluteUrl("/docs/api") },
};

const QUICK_START = `# 1. Get an upload URL
curl -X POST https://refile.denoiselabs.com/api/v1/uploads \\
  -H "Authorization: Bearer rf_live_..."
# → { "uploadUrl": "...", "expiresInSeconds": 1800 }

# 2. Upload your file to that URL
curl -X POST "$UPLOAD_URL" \\
  -H "Content-Type: image/png" \\
  --data-binary @photo.png
# → { "storageId": "kg2..." }

# 3. Submit the job (waits up to 25s for short jobs)
curl -X POST 'https://refile.denoiselabs.com/api/v1/jobs?wait=true' \\
  -H "Authorization: Bearer rf_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "make this black and white",
    "files": [{"storageId":"kg2...","filename":"photo.png"}]
  }'`;

const UPLOADS_SHAPE = `// Request
POST /api/v1/uploads
Authorization: Bearer rf_live_...

// Response
{
  "uploadUrl": "string",          // signed URL — POST your file bytes here
  "expiresInSeconds": 1800
}`;

const JOBS_REQUEST = `POST /api/v1/jobs?wait=true
Authorization: Bearer rf_live_...
Content-Type: application/json

{
  "prompt": "string (required, 1..2000 chars)",
  "files": [
    { "storageId": "string", "filename": "string" }
  ],                                                  // optional
  "chat_id": "string",                                // optional — group jobs into a thread
  "webhook_url": "https://example.com/refile-events"  // optional — POST when job settles
}`;

const JOB_SHAPE = `{
  "id": "string",
  "chat_id": "string | null",
  "status": "pending | generating | running | succeeded | failed",
  "description": "string | null",
  "kind": "command | chat | null",
  "message": "string | null",     // set when kind == "chat"
  "input_files": ["string"],
  "outputs": [
    { "storageId": "string", "filename": "string", "url": "string | null" }
  ],
  "pipeline": [                   // populated for multi-step jobs
    { "description": "string", "status": "pending | running | completed | failed" }
  ] | null,
  "files_expired": "boolean",     // outputs are GC'd after 24h
  "created_at": "number",         // unix ms
  "error": { "code": "string", "message": "string" } | null
}`;

const WEBHOOK_HEADERS = `Content-Type:        application/json
X-Refile-Event:      job.settled
X-Refile-Delivery:   <uuid>
X-Refile-Signature:  sha256=<hex>   // HMAC-SHA256 over the raw body`;

const ERRORS = [
  ["unauthorized", "401", "Missing or invalid API key."],
  ["invalid_request", "400", "Validation failed on the request body."],
  ["not_found", "404", "Job id not found, or not yours."],
  ["quota_exceeded", "402", "Plan limits exceeded."],
  ["rate_limited", "429", "Too many requests. Retry-After header is set."],
  ["unprocessable_request", "200 (job error)", "Prompt was too complex to plan."],
  ["no_output", "200 (job error)", "Job ran but produced no output file."],
  ["execution_failed", "200 (job error)", "Job ran but the file failed processing."],
  ["internal_error", "500", "Service problem. Safe to retry."],
];

export default function Page() {
  return (
    <>
      <DocHeader
        eyebrow="Reference"
        title="API"
        intro="Submit natural-language file operations from any backend. Same engine as the web app."
      />

      <DocSection title="Quick start">
        <p>
          Base URL: <code className="text-mono">https://refile.denoiselabs.com/api/v1</code>.
          All requests are HTTPS; responses are JSON.
        </p>
        <DocCode>{QUICK_START}</DocCode>
        <DocList
          items={[
            "Step 1 returns a short-lived signed URL — no auth on the upload itself.",
            "Step 2 POSTs the raw file bytes; the storage layer responds with a storageId.",
            "Step 3 creates the job. With ?wait=true the response blocks up to 25s for the finished job; without it, you get status=pending immediately.",
          ]}
        />
        <p>
          →{" "}
          <a
            href="/settings/api"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Get your API key
          </a>
          .
        </p>
      </DocSection>

      <DocSection title="Authentication">
        <p>
          Send your key as a bearer token on every request:{" "}
          <code className="text-mono">Authorization: Bearer rf_live_...</code>.
          Keys are server-side credentials — never embed them in browser, mobile,
          or public code.
        </p>
        <DocCallout tone="warn">
          Keys can&apos;t be retrieved after creation. If you lose one, revoke
          it at{" "}
          <a
            href="/settings/api"
            className="text-foreground underline-offset-4 hover:underline"
          >
            /settings/api
          </a>{" "}
          and create a new one.
        </DocCallout>
      </DocSection>

      <DocSection title="Endpoints">
        <h3 className="mt-2 text-[15px] font-semibold tracking-tight text-foreground">
          POST /api/v1/uploads
        </h3>
        <p>
          Mint a signed upload URL. No body. You then POST the raw file bytes
          to <code className="text-mono">uploadUrl</code>; that storage call
          returns a <code className="text-mono">storageId</code> to pass into a
          job.
        </p>
        <DocCode>{UPLOADS_SHAPE}</DocCode>

        <h3 className="mt-6 text-[15px] font-semibold tracking-tight text-foreground">
          POST /api/v1/jobs
        </h3>
        <p>
          Create a job. Pass{" "}
          <code className="text-mono">?wait=true</code> to long-poll up to 25
          seconds for the finished result; omit it to return immediately. The
          response body is{" "}
          <a
            href="#job-object"
            className="text-foreground underline-offset-4 hover:underline"
          >
            the job object
          </a>
          .
        </p>
        <DocCode>{JOBS_REQUEST}</DocCode>

        <h3 className="mt-6 text-[15px] font-semibold tracking-tight text-foreground">
          GET /api/v1/jobs/:id
        </h3>
        <p>
          Fetch the current state of a job. Use this to poll after creating a
          job without <code className="text-mono">?wait=true</code>, or to
          confirm a webhook delivery. Returns the same job object.
        </p>
      </DocSection>

      <DocSection title="The job object">
        <div id="job-object" />
        <p>Every job endpoint returns the same shape:</p>
        <DocCode>{JOB_SHAPE}</DocCode>
        <p>
          Convex&apos;s internal <code className="text-mono">completed</code>{" "}
          state surfaces as <code className="text-mono">succeeded</code> in the
          API. Output <code className="text-mono">url</code> is a short-lived
          signed download link — fetch within the 24-hour retention window or{" "}
          <code className="text-mono">files_expired</code> will flip to{" "}
          <code className="text-mono">true</code>.
        </p>
      </DocSection>

      <DocSection title="Errors">
        <p>
          Errors are returned as{" "}
          <code className="text-mono">
            {`{"error":{"code":"...","message":"..."}}`}
          </code>{" "}
          with the matching HTTP status.
        </p>
        <p className="text-[13.5px] text-muted-foreground">
          Codes marked <em>job error</em> are job-level failures, not
          request-level: HTTP 200, with{" "}
          <code className="text-mono">status: &quot;failed&quot;</code> and a
          populated <code className="text-mono">error</code> field on the job
          object. The request itself was accepted.
        </p>
        <div className="overflow-x-auto">
          <table className="my-4 w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-4 text-left font-medium text-foreground">
                  Code
                </th>
                <th className="py-2 pr-4 text-left font-medium text-foreground">
                  Status
                </th>
                <th className="py-2 text-left font-medium text-foreground">
                  When
                </th>
              </tr>
            </thead>
            <tbody className="text-foreground/80">
              {ERRORS.map(([code, status, when]) => (
                <tr key={code} className="border-b border-border/40">
                  <td className="py-2 pr-4 font-mono text-foreground">
                    {code}
                  </td>
                  <td className="py-2 pr-4">{status}</td>
                  <td className="py-2">{when}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DocSection>

      <DocSection title="Webhooks">
        <DocList
          items={[
            "Pass webhook_url on job creation. We POST the full job object to it once the job settles (succeeded or failed).",
            "Delivery headers: X-Refile-Event: job.settled, X-Refile-Delivery: <uuid>, X-Refile-Signature: sha256=<hex> (HMAC-SHA256 over the raw body).",
            "Retried up to 3× with 1s / 5s backoff on any non-2xx response or network error.",
          ]}
        />
        <DocCode>{WEBHOOK_HEADERS}</DocCode>
        <DocCallout>
          Signature verification requires a shared secret — currently issued
          via support. Self-serve secret rotation is on the roadmap. Until
          then, treat the webhook as a delivery hint and re-fetch{" "}
          <code className="text-mono">GET /jobs/:id</code> to confirm state.
        </DocCallout>
      </DocSection>

      <DocSection title="Rate limits & quotas">
        <DocList
          items={[
            "10 requests/sec per key, burst of 20. 429 responses include a Retry-After header in seconds.",
            "File size, file count, and pipeline-step limits match your plan — identical to the web app. See /docs/limits-and-plans.",
            "Jobs are async by default. Pass ?wait=true to long-poll for up to 25 seconds; after that, poll GET /api/v1/jobs/:id.",
          ]}
        />
      </DocSection>

      <DocSection title="Pricing">
        <p>
          Pay-as-you-go, no monthly minimum. Usage is metered per job and
          billed monthly.
        </p>
        <DocList
          items={[
            "$0.05 per command job.",
            "$0.05 per pipeline step (multi-step jobs are billed per step).",
          ]}
        />
        <p>
          See{" "}
          <a
            href="/pricing"
            className="text-foreground underline-offset-4 hover:underline"
          >
            /pricing
          </a>{" "}
          for the full breakdown and current regional pricing.
        </p>
      </DocSection>

      <DocSection title="What's next">
        <DocList
          items={[
            "Create a key at /settings/api.",
            "See live pricing at /pricing.",
            "Read the rest of the docs at /docs.",
          ]}
        />
      </DocSection>
    </>
  );
}
