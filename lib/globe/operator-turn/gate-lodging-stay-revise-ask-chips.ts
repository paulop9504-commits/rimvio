import type { EventCandidate } from "@/lib/events/event-candidate";
import { tryRunReviseCommand } from "@/lib/globe/context-hub/try-run-revise-command";
import type { OperatorTurnPlan } from "@/lib/globe/operator-turn/types";

/** Gate — Revise Intent confirm chips (shared with NL pipeline). */
export function gateLodgingStayReviseAskChips(input: {
  text: string;
  contextEventId: string;
  event: EventCandidate | null | undefined;
}): OperatorTurnPlan | null {
  const revised = tryRunReviseCommand({
    utterance: input.text,
    contextEventId: input.contextEventId,
    event: input.event,
  });
  if (!revised || revised.via !== "revise_confirm") {
    return null;
  }
  return {
    tool: "ask_chips",
    reason: "lodging_stay_revise",
    chips: revised.reviseChips,
  };
}
