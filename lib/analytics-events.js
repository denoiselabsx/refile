/**
 * Canonical analytics event names. Both the Next.js frontend and the Convex
 * backend import from here so a typo on either side is a build-time error,
 * and so the admin dashboard has the full list to pick from without
 * scanning the raw events table.
 *
 * Add a new event by appending to EVENT_NAMES below AND giving it a short
 * label in EVENT_LABELS. Never delete or rename an event in place — the
 * rollup table is keyed by name and renames silently break historical data.
 */

export const EVENT_NAMES = [
  // Conversion lifecycle (server-side, fired from runJob / prompts.submit)
  "conversion_started",
  "conversion_completed",
  "conversion_failed",
  // Quota / billing pressure
  "daily_limit_hit",
  "upgrade_clicked",
  // Differentiation features
  "preset_used",
  "quick_convert_used",
  "follow_up_used",
  "voice_used",
  // Sharing / virality
  "share_link_created",
  "share_link_viewed",
  // Cloud integrations
  "gdrive_import",
  "gdrive_export",
  // SEO / acquisition
  "landing_view",
];

export const EVENT_LABELS = {
  conversion_started: "Conversion started",
  conversion_completed: "Conversion completed",
  conversion_failed: "Conversion failed",
  daily_limit_hit: "Daily limit hit",
  upgrade_clicked: "Upgrade clicked",
  preset_used: "Preset used",
  quick_convert_used: "Quick convert used",
  follow_up_used: "Follow-up used",
  voice_used: "Voice input used",
  share_link_created: "Share link created",
  share_link_viewed: "Share link viewed",
  gdrive_import: "Google Drive import",
  gdrive_export: "Google Drive export",
  landing_view: "Landing page view",
};

/** True if a name is a known canonical event. */
export function isKnownEvent(name) {
  return EVENT_NAMES.includes(name);
}

/** UTC day bucket for a timestamp, "YYYY-MM-DD". */
export function dayKey(date = new Date()) {
  return (
    `${date.getUTCFullYear()}-` +
    `${String(date.getUTCMonth() + 1).padStart(2, "0")}-` +
    `${String(date.getUTCDate()).padStart(2, "0")}`
  );
}
