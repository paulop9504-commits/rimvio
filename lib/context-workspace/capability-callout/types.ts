/**
 * Workspace Capability Callouts — Object hub modules (not info walls).
 * Bloom shows ≤4; catalog can grow later.
 */

export type WorkspaceCapabilityKind =
  | "insight"
  | "price"
  | "review"
  | "nearby"
  | "day"
  | "action";

/** Evidence chips under Insight — only show what is actually grounded. */
export type CapabilityEvidenceId =
  | "review"
  | "price"
  | "schedule"
  | "distance";

export type CapabilityEvidenceItem = {
  readonly id: CapabilityEvidenceId;
  readonly labelKo: string;
  readonly present: boolean;
};

/** Thin live pulse — no invented weather/crowd/rooms. */
export type CapabilityLiveSignal = {
  readonly id: string;
  readonly labelKo: string;
  readonly valueKo: string;
  readonly tone: "neutral" | "good" | "warn";
};

export type WorkspaceCapabilityCallout = {
  readonly id: string;
  readonly kind: WorkspaceCapabilityKind;
  /** Short chip label */
  readonly labelKo: string;
  /** One-line on chip */
  readonly valueKo: string;
  /** Expanded body lines */
  readonly linesKo: readonly string[];
  readonly confidence: number | null;
  readonly icon: "sparkle" | "price" | "star" | "pin" | "calendar" | "bolt";
  /** Insight only — why we trust this recommendation */
  readonly evidence?: readonly CapabilityEvidenceItem[];
};

export type WorkspaceCapabilityRecipe = "travel" | "business" | "date";

export type WorkspaceCapabilityBundle = {
  readonly callouts: readonly WorkspaceCapabilityCallout[];
  readonly liveSignals: readonly CapabilityLiveSignal[];
};
