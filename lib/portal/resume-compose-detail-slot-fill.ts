import type { PortalComposeRunState } from "@/lib/portal/portal-compose-run-store";
import {
  readPortalComposeRunState,
  writePortalComposeRunState,
} from "@/lib/portal/portal-compose-run-store";
import { beginComposeDetailSlotFill } from "@/lib/portal/compose-draft/run-compose-slot-fill";
import {
  resolvePortalComposeRunTurn,
  type PortalComposeRunTurnResult,
} from "@/lib/portal/resolve-portal-compose-run-turn";

/** "자세히 맞추기" — ask optional category slots one-by-one. */
export async function resumeComposeDetailSlotFill(input: {
  graphId: string;
  liveLat?: number | null;
  liveLng?: number | null;
}): Promise<PortalComposeRunTurnResult | null> {
  const state = readPortalComposeRunState(input.graphId);
  if (!state || state.status !== "ready") {
    return null;
  }

  const next = beginComposeDetailSlotFill(state);
  writePortalComposeRunState(next);

  return resolvePortalComposeRunTurn({
    graphId: input.graphId,
    intentId: state.intentId,
    categoryId: state.categoryId,
    message: state.accumulatedText,
    eventId: state.eventId,
    liveLat: input.liveLat ?? null,
    liveLng: input.liveLng ?? null,
    resumeState: next,
    answerText: "",
  });
}

export function canResumeComposeDetailSlotFill(state: PortalComposeRunState | null): boolean {
  return Boolean(state?.status === "ready" && !state.detailSlotFill);
}
