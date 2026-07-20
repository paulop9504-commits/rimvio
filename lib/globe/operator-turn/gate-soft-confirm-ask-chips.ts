import { tryRunSoftConfirmCommand } from "@/lib/globe/soft-confirm/try-run-soft-confirm-command";
import type { OperatorTurnPlan } from "@/lib/globe/operator-turn/types";

/** Gate — Filter / Pin / Delete soft confirm chips (not Field). */
export function gateSoftConfirmAskChips(input: {
  text: string;
  contextEventId: string;
  anchorLat?: number | null;
  anchorLng?: number | null;
}): OperatorTurnPlan | null {
  const soft = tryRunSoftConfirmCommand({
    utterance: input.text,
    contextEventId: input.contextEventId,
    anchorLat: input.anchorLat,
    anchorLng: input.anchorLng,
  });
  if (!soft || soft.via !== "soft_confirm") {
    return null;
  }
  return {
    tool: "ask_chips",
    reason: "soft_graph_confirm",
    chips: soft.softConfirmChips,
  };
}
