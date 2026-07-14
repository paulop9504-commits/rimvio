/**
 * Scout Narrator — structured plan in, Cursor-style user copy out.
 * Never LLM prose; templates only.
 */

export type ScoutNarrationIntent = "Search" | "Refine" | "Clarify";

export type ScoutNarrationMode = "Replace" | "Continue" | "Merge";

export type ScoutNarrationDomain =
  | "Eatery"
  | "Lodging"
  | "Activity"
  | "Amenity"
  | "Mixed"
  | "Unknown";

/** Structured execution plan — planner output, SSOT for Narrator. */
export type ScoutNarrationPlan = {
  readonly version: 1;
  readonly intent: ScoutNarrationIntent;
  readonly mode: ScoutNarrationMode;
  readonly domain: ScoutNarrationDomain;
  /** User-facing entity label — e.g. "초밥", "말차 아이스크림". */
  readonly entityLabelKo: string | null;
  /** Prior focuses dropped this turn. */
  readonly dropLabelsKo: readonly string[];
  /** Prefs kept across turns (transport/budget…). */
  readonly keepLabelsKo: readonly string[];
  readonly anchorLabelKo: string | null;
  readonly sortHint: "rating" | "distance" | "mixed" | null;
};

export type ScoutNarrationProgressStep = {
  readonly id: string;
  readonly textKo: string;
};

/** Narrator output — understanding + gray progress logs. */
export type ScoutNarration = {
  readonly plan: ScoutNarrationPlan;
  /** 1–3 short paragraphs — why / drop / next. */
  readonly understandingKo: string;
  readonly progressSteps: readonly ScoutNarrationProgressStep[];
};
