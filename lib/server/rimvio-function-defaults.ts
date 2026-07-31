/**
 * Shared Vercel Function defaults for Korea-first Rimvio (Pro).
 * preferredRegion icn1 · longer maxDuration for lodging/search.
 */

/** Seoul — lowest latency for KO users + nearby Asia upstreams. */
export const RIMVIO_FUNCTION_REGION = "icn1" as const;

/** Hot path (search · lodging · compose) — Pro allows up to 300s. */
export const RIMVIO_FUNCTION_MAX_DURATION_HOT = 60;

/** Tile proxy — stay short; CDN should hit most requests. */
export const RIMVIO_FUNCTION_MAX_DURATION_TILE = 15;

/** Chat / OCR / capture — Pro headroom without runaway bills. */
export const RIMVIO_FUNCTION_MAX_DURATION_LONG = 120;
