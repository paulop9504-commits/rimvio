/**
 * Workstream — event residue of user work (not Context-as-product).
 * @see docs/adr/036-work-becomes-context.md
 * @see docs/adr/037-reality-commit-confirms-context.md
 */

/** Product slogan — never ask users to create a context. */
export const WORK_BECOMES_CONTEXT_SLOGAN =
  "Never ask users to create a context. Let their work become the context." as const;

/**
 * Internal pipeline (engine only — not user copy).
 * Input → Workstream → Planner → Object Graph → Reality Commit
 */
export const WORKSTREAM_PIPELINE = [
  "input",
  "workstream",
  "planner",
  "object_graph",
  "reality_commit",
] as const;

export type WorkstreamPipelineStage = (typeof WORKSTREAM_PIPELINE)[number];

/**
 * Residue ladder — Observation never lands here as durable history.
 * @see ADR-037
 */
export const REALITY_RESIDUE_LAYERS = [
  "observation",
  "selection",
  "commit",
  "context_reality",
] as const;

export type RealityResidueLayer = (typeof REALITY_RESIDUE_LAYERS)[number];

/** Meaningful residue — search / scout inventory is NOT in this set. */
export type WorkstreamEventKind =
  | "HotelSelected"
  | "HotelCommitted"
  | "RestaurantAdded"
  | "RentalAdded"
  | "FlightCommitted"
  | "ScheduleUpdated"
  | "BudgetUpdated"
  | "TitleInferred";

export type WorkstreamEvent = {
  readonly id: string;
  readonly kind: WorkstreamEventKind;
  readonly atIso: string;
  readonly contextEventId: string;
  readonly labelKo: string;
  readonly objectId?: string | null;
  readonly placeId?: string | null;
  readonly payload?: Readonly<Record<string, unknown>>;
};

export type WorkstreamState = {
  readonly contextEventId: string;
  /** Untitled until enough residue to infer. */
  readonly title: string;
  readonly phase: "scratch" | "named" | "committed";
  readonly events: readonly WorkstreamEvent[];
  readonly updatedAtIso: string;
};

export const WORKSTREAM_UNTITLED = "Untitled";
export const WORKSTREAM_SCRATCH_LABELS = [
  WORKSTREAM_UNTITLED,
  "제목 없음",
  "Scratch",
  "새 프로젝트",
  "새 맥락",
] as const;

/** Selection-layer default confidence (Candidate, not Confirmed). */
export const SELECTION_CANDIDATE_CONFIDENCE = 0.6;

export function isScratchWorkstreamTitle(title: string | null | undefined): boolean {
  const t = title?.trim() ?? "";
  if (!t) return true;
  return (WORKSTREAM_SCRATCH_LABELS as readonly string[]).includes(t);
}

export function residueLayerForEventKind(
  kind: WorkstreamEventKind,
): RealityResidueLayer {
  switch (kind) {
    case "HotelSelected":
    case "RestaurantAdded":
    case "RentalAdded":
      return "selection";
    case "HotelCommitted":
    case "FlightCommitted":
      return "commit";
    case "ScheduleUpdated":
    case "BudgetUpdated":
    case "TitleInferred":
      return "context_reality";
    default:
      return "selection";
  }
}
