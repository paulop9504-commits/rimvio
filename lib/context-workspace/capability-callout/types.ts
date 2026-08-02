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
};

export type WorkspaceCapabilityRecipe = "travel" | "business" | "date";
