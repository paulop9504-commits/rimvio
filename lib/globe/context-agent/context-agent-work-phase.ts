/** Context-bound agent work FSM — Cursor-like step loop (not generic chat). */

export type ContextAgentWorkPhase =
  | "idle"
  | "briefing"
  | "collecting_context"
  | "scouting"
  | "deciding"
  | "awaiting_human"
  | "pinned"
  | "replanning";

const ORDERED: readonly ContextAgentWorkPhase[] = [
  "idle",
  "briefing",
  "collecting_context",
  "scouting",
  "deciding",
  "awaiting_human",
  "pinned",
  "replanning",
];

export function isContextAgentWorkPhase(
  value: string | null | undefined,
): value is ContextAgentWorkPhase {
  return ORDERED.includes(value as ContextAgentWorkPhase);
}

/** Legal transitions — prevents orphan UI states. */
export function canTransitionContextAgentWorkPhase(
  from: ContextAgentWorkPhase,
  to: ContextAgentWorkPhase,
): boolean {
  if (from === to) {
    return true;
  }
  if (to === "idle") {
    return true;
  }
  switch (from) {
    case "idle":
      return to === "briefing";
    case "briefing":
      return (
        to === "collecting_context" ||
        to === "scouting" ||
        to === "deciding" ||
        to === "replanning"
      );
    case "collecting_context":
      return to === "scouting" || to === "replanning";
    case "scouting":
      return to === "deciding" || to === "collecting_context";
    case "deciding":
      return to === "awaiting_human" || to === "replanning" || to === "scouting";
    case "awaiting_human":
      // Continuous prompt→map: next Act may re-scout / edit without pinned first.
      return (
        to === "pinned" ||
        to === "replanning" ||
        to === "deciding" ||
        to === "scouting" ||
        to === "collecting_context"
      );
    case "pinned":
      return to === "replanning" || to === "scouting" || to === "deciding";
    case "replanning":
      return to === "scouting" || to === "collecting_context" || to === "deciding";
    default:
      return false;
  }
}

export function transitionContextAgentWorkPhase(
  from: ContextAgentWorkPhase,
  to: ContextAgentWorkPhase,
): ContextAgentWorkPhase {
  if (!canTransitionContextAgentWorkPhase(from, to)) {
    return from;
  }
  return to;
}

export function isContextAgentWorkPhaseBusy(phase: ContextAgentWorkPhase): boolean {
  return (
    phase === "collecting_context" ||
    phase === "scouting" ||
    phase === "replanning"
  );
}
