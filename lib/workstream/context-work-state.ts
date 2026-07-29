/**
 * Context Work State — Cursor-like working memory for a Context.
 * Conversation ≠ State ≠ Action Queue ≠ Commit Ledger.
 * @see docs/adr/038-context-work-manager.md
 */

export const CONTEXT_WORK_SLOT_IDS = [
  "destination",
  "dates",
  "lodging",
  "flight",
  "route",
  "food",
  "transport",
  "guests",
  "budget",
] as const;

export type ContextWorkSlotId = (typeof CONTEXT_WORK_SLOT_IDS)[number];

export type ContextWorkStatus =
  | "building"
  | "optimizing"
  | "awaiting_commit"
  | "idle";

export type ContextWorkNextAction = {
  readonly id: string;
  readonly labelKo: string;
  /** Utterance to enqueue when user says 계속해 / taps 계속 진행. */
  readonly enqueueUtterance: string;
  readonly slotId: ContextWorkSlotId | null;
};

export type ContextWorkState = {
  readonly contextEventId: string;
  readonly title: string;
  readonly status: ContextWorkStatus;
  readonly percent: number;
  readonly completed: readonly ContextWorkSlotId[];
  readonly pending: readonly ContextWorkSlotId[];
  readonly inProgress: ContextWorkSlotId | null;
  readonly nextActions: readonly ContextWorkNextAction[];
  readonly updatedAtIso: string;
};

export const CONTEXT_WORK_SLOT_LABEL_KO: Record<ContextWorkSlotId, string> = {
  destination: "지역",
  dates: "날짜",
  lodging: "숙소",
  flight: "항공",
  route: "동선",
  food: "맛집",
  transport: "이동",
  guests: "인원",
  budget: "예산",
};
