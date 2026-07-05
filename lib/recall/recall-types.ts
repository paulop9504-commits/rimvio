/** Recall Engine V2 — time × people × place triggered nostalgia (no LLM). */

export const RECALL_TRIGGERS = [
  "same_person",
  "same_place",
  "same_date",
  "same_city",
  "same_calendar_event",
  "similar_time_of_week",
  "plan_mode_match",
  "context_note_echo",
] as const;

export type RecallTrigger = (typeof RECALL_TRIGGERS)[number];

export type RecallMediaKind = "photo" | "video" | "globe_pin" | "none";

export type RecallMedia = {
  kind: RecallMediaKind;
  captureId?: string;
  url?: string;
  placeLabel?: string;
  capturedAtIso?: string;
};

export type RecallCandidate = {
  id: string;
  /** Past experience to replay. */
  eventId: string;
  triggers: readonly RecallTrigger[];
  headline: string;
  media: RecallMedia;
  reason: string;
  /** 0–100 composite confidence. */
  confidence: number;
  feedHref: string;
};

export type RecallAnchor = {
  /** Current context — excluded from matches. */
  eventId?: string | null;
  title?: string | null;
  place?: string | null;
  peerDisplayName?: string | null;
  datetimeIso?: string | null;
  /** Google Calendar recurring id when available. */
  gcalEventId?: string | null;
  /** Pin context note for echo matching. */
  contextNote?: string | null;
  planMode?: "solo" | "group" | null;
};

/** Minimum confidence to surface. */
export const RECALL_MIN_CONFIDENCE = 45;

/** Proactive recall — rare enough to feel special, not a daily chore. */
export const RECALL_MIN_INTERVAL_DAYS = 5;

export const RECALL_MIN_INTERVAL_MS = RECALL_MIN_INTERVAL_DAYS * 86_400_000;

/** Same past experience — do not resurface within this window. */
export const RECALL_SAME_EVENT_COOLDOWN_MS = RECALL_MIN_INTERVAL_MS;

/** @deprecated Use RECALL_MIN_INTERVAL_MS — kept for imports. */
export const RECALL_MAX_PER_DAY = 1;

/** @deprecated Use RECALL_MIN_INTERVAL_MS — kept for imports. */
export const RECALL_COOLDOWN_MS = RECALL_MIN_INTERVAL_MS;
