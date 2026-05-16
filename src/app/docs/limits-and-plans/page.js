import { absoluteUrl } from "@/lib/site";
import {
  DocHeader,
  DocSection,
  DocCallout,
} from "@/components/docs/doc-parts";
import { PLAN_IDS, getPlan } from "../../../../lib/plans.js";

export const metadata = {
  title: "Limits & plans — Docs",
  description:
    "ReFile plan limits: monthly conversions, file size caps, batch sizes, presets, and how pay-as-you-go works.",
  alternates: { canonical: absoluteUrl("/docs/limits-and-plans") },
};

function sizeLabel(bytes) {
  return bytes >= 1024 * 1024 * 1024
    ? `${Math.round(bytes / (1024 * 1024 * 1024))} GB`
    : `${Math.round(bytes / (1024 * 1024))} MB`;
}

export default function Page() {
  // Pull straight from the enforced source of truth so docs can't drift.
  const plans = PLAN_IDS.map((id) => getPlan(id, "global"));

  return (
    <>
      <DocHeader
        eyebrow="Plans & limits"
        title="Limits & plans"
        intro="The exact, enforced limits per plan. Numbers here are read from the same config the app enforces — they can't drift from reality."
      />

      <DocSection title="The plans">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Plan</th>
                <th className="py-2 pr-3 font-medium">Price</th>
                <th className="py-2 pr-3 font-medium">Conversions/mo</th>
                <th className="py-2 pr-3 font-medium">Max file</th>
                <th className="py-2 pr-3 font-medium">Batch</th>
                <th className="py-2 font-medium">Presets</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-border/60 text-foreground/85"
                >
                  <td className="py-2.5 pr-3 font-medium text-foreground">
                    {p.name}
                  </td>
                  <td className="py-2.5 pr-3">
                    {p.priceMonthly === 0 ? "Free" : `$${p.priceMonthly}/mo`}
                  </td>
                  <td className="py-2.5 pr-3">
                    {p.includedConversions.toLocaleString()}
                    {p.overagePerConversion == null ? " (hard cap)" : ""}
                  </td>
                  <td className="py-2.5 pr-3">{sizeLabel(p.maxFileBytes)}</td>
                  <td className="py-2.5 pr-3">{p.maxFilesPerConversion}</td>
                  <td className="py-2.5">
                    {p.maxPresets == null ? "Unlimited" : p.maxPresets}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[13px] text-muted-foreground">
          India is priced lower for the same limits — prices shown here are
          global. Your billing region is detected automatically.
        </p>
      </DocSection>

      <DocSection title="What counts as a conversion">
        <p>
          One successful prompt-and-run = one conversion, no matter how many
          files were in that batch. A <strong>failed or refused</strong>{" "}
          attempt is never counted. Voice transcription is always free.
        </p>
      </DocSection>

      <DocSection title="Pay-as-you-go (paid plans)">
        <p>
          On Student, Pro, and Power you get a monthly included amount.
          Beyond that, each extra successful conversion is{" "}
          <strong>$0.02</strong>, billed at the end of the month. The Free
          plan has no overage — it stops at its cap until the next month or
          an upgrade.
        </p>
      </DocSection>

      <DocSection title="File retention">
        <p>
          Uploads and outputs are deleted automatically{" "}
          <strong>24 hours</strong> after a run. Your chat history (the
          request and summary) stays so you can re-run it.
        </p>
      </DocSection>

      <DocCallout>
        Billing, invoices, and refunds are handled by our payment provider
        (Polar, a merchant of record) — taxes and receipts included. You
        can manage or cancel any time from the pricing page.
      </DocCallout>
    </>
  );
}
