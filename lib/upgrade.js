/**
 * Upgrade-gate logic. Backend quota errors are prefixed with a parseable
 * tag `[[UPGRADE:<kind>:<currentPlanId>]] human readable message`. This
 * module turns that into everything the upgrade modal needs: which plan to
 * recommend, and an attractive "here's what you unlock" pitch.
 *
 * Pure (no framework imports) so it's usable anywhere.
 */

import { PLAN_IDS, getPlan } from "./plans.js";

const TAG_RE = /^\[\[UPGRADE:([a-z]+):([a-z]+)\]\]\s*(.*)$/s;

/**
 * Parse a thrown error message. Returns null if it's NOT an upgrade wall
 * (so callers fall back to a normal error toast).
 *
 * @returns {null | { kind, currentPlanId, message }}
 *   kind ∈ "conversions" | "filesize" | "batch" | "presets"
 */
export function parseUpgradeError(errMessage) {
  if (!errMessage) return null;
  const m = String(errMessage).match(TAG_RE);
  if (!m) return null;
  return { kind: m[1], currentPlanId: m[2], message: m[3].trim() };
}

/** The next plan up from `currentPlanId` that actually lifts the limit.
 * Free→Student→Pro→Power. Power has no higher tier (returns null). */
export function recommendedPlanId(currentPlanId, kind) {
  const idx = PLAN_IDS.indexOf(currentPlanId);
  if (idx === -1) return "student"; // unknown → cheapest paid
  // For preset/batch/filesize, Pro already gives unlimited/large — but to
  // keep it simple and always "one clear upgrade", just step up one tier.
  const next = PLAN_IDS[idx + 1];
  return next || null; // null = already on the top plan
}

/**
 * Build the modal's content for a given wall. Region-aware pricing so the
 * CTA shows the right amount.
 *
 * @returns { title, hook, currentPlan, targetPlan, perks[] } | null
 *   null when there's no higher plan to sell (already on Power).
 */
export function upgradeOffer(parsed, region = "global") {
  if (!parsed) return null;
  const targetId = recommendedPlanId(parsed.currentPlanId, parsed.kind);
  if (!targetId) return null; // already top tier — nothing to upsell

  const current = getPlan(parsed.currentPlanId, region);
  const target = getPlan(targetId, region);

  const sizeLabel = (bytes) =>
    bytes >= 1024 * 1024 * 1024
      ? `${Math.round(bytes / (1024 * 1024 * 1024))} GB`
      : `${Math.round(bytes / (1024 * 1024))} MB`;

  const titles = {
    conversions: "You're on a roll 🎉",
    filesize: "That file's a big one",
    batch: "Converting in bulk?",
    presets: "Save more recipes",
  };
  const hooks = {
    conversions: `You've used every conversion on ${current.name} this month. ${target.name} gives you a lot more headroom — plus pay-as-you-go so you're never blocked again.`,
    filesize: `${current.name} caps files at ${sizeLabel(
      current.maxFileBytes
    )}. ${target.name} handles files up to ${sizeLabel(
      target.maxFileBytes
    )}.`,
    batch: `${current.name} does ${current.maxFilesPerConversion} file(s) per conversion. ${target.name} lets you batch up to ${target.maxFilesPerConversion} at once.`,
    presets: `${current.name} allows ${current.maxPresets} saved presets. ${target.name} makes it unlimited.`,
  };

  // The 3-4 most attractive things they get on the target plan.
  const perks = [
    target.includedConversions >= 9999
      ? "Effectively unlimited conversions"
      : `${target.includedConversions.toLocaleString()} conversions / month`,
    `Files up to ${sizeLabel(target.maxFileBytes)}`,
    target.maxFilesPerConversion > 1
      ? `Batch up to ${target.maxFilesPerConversion} files at once`
      : "Single-file conversions",
    target.maxPresets == null
      ? "Unlimited saved presets"
      : `Up to ${target.maxPresets} saved presets`,
    target.overagePerConversion != null
      ? `Pay-as-you-go after that — just $${target.overagePerConversion.toFixed(
          2
        )}/extra`
      : null,
  ].filter(Boolean);

  return {
    kind: parsed.kind,
    title: titles[parsed.kind] || "Unlock more with an upgrade",
    hook: hooks[parsed.kind] || parsed.message,
    currentPlanName: current.name,
    targetPlanId: targetId,
    targetPlanName: target.name,
    targetPriceMonthly: target.priceMonthly,
    perks,
  };
}
