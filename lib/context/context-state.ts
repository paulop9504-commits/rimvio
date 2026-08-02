/**
 * Context State — Reality Context lifecycle.
 *
 * planning → active → completed
 *
 * Context is not a passive record: it carries current Reality State.
 */

export const REALITY_CONTEXT_STATUSES = [
  "planning",
  "active",
  "completed",
] as const;

export type RealityContextStatus = (typeof REALITY_CONTEXT_STATUSES)[number];

export const REALITY_CONTEXT_STATUS_TRANSITIONS: Readonly<
  Record<RealityContextStatus, readonly RealityContextStatus[]>
> = {
  planning: ["active", "completed"],
  active: ["completed", "planning"],
  completed: ["planning"],
};

export function canTransitionContextStatus(
  from: RealityContextStatus,
  to: RealityContextStatus,
): boolean {
  if (from === to) return true;
  return REALITY_CONTEXT_STATUS_TRANSITIONS[from].includes(to);
}

export function assertContextStatusTransition(
  from: RealityContextStatus,
  to: RealityContextStatus,
): void {
  if (!canTransitionContextStatus(from, to)) {
    throw new Error(
      `Context State: illegal transition ${from} → ${to}`,
    );
  }
}

export function nextContextStatus(
  from: RealityContextStatus,
): RealityContextStatus | null {
  const next = REALITY_CONTEXT_STATUS_TRANSITIONS[from][0];
  return next ?? null;
}

export function contextStatusLabelKo(status: RealityContextStatus): string {
  if (status === "planning") return "Planning";
  if (status === "active") return "Active";
  return "Completed";
}
