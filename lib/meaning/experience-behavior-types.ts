/** Projection-only behavior signals — no parallel event store. */
export type ExperienceBehaviorKind =
  | "open"
  | "share"
  | "recall_open"
  | "recall_dismiss"
  | "edit";

export type ExperienceBehaviorRecord = {
  eventId: string;
  kind: ExperienceBehaviorKind;
  atIso: string;
};

export const EXPERIENCE_BEHAVIOR_WEIGHTS: Record<ExperienceBehaviorKind, number> = {
  open: 3,
  share: 8,
  recall_open: 6,
  recall_dismiss: -4,
  edit: 4,
};
