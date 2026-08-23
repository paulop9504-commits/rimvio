import type { LoopType } from "@/lib/loop-wiring/loop-contract";
import { shouldRenderLatentSuggestionLayers } from "@/lib/surface-composition/surface-collapse-controller";

export type MorningAutoPrepReason =
  | "morning_unlock"
  | "not_morning_loop"
  | "not_first_unlock"
  | "dismissed";

export type MorningAutoPrepDecision = {
  visible: boolean;
  reason: MorningAutoPrepReason;
  /** Prep calendar rows exist — render PrepSurfaceBoard when true. */
  showPrepRows: boolean;
};

export function resolveMorningAutoPrepSurface(input: {
  dominantLoop: LoopType | null;
  firstUnlockToday: boolean;
  prepSurfaceVisible: boolean;
  dismissedForDateKey: string | null;
  dateKey: string;
}): MorningAutoPrepDecision {
  if (input.dominantLoop !== "MORNING_LOOP") {
    return { visible: false, reason: "not_morning_loop", showPrepRows: false };
  }
  if (input.dismissedForDateKey === input.dateKey) {
    return { visible: false, reason: "dismissed", showPrepRows: false };
  }
  if (!input.firstUnlockToday) {
    return { visible: false, reason: "not_first_unlock", showPrepRows: false };
  }
  return {
    visible: true,
    reason: "morning_unlock",
    showPrepRows: input.prepSurfaceVisible,
  };
}

export function shouldRenderLatentLayersWithMorningAutoPrep(input: {
  frame: { layout: { primary: { id: string; visibility?: string } | null } };
  morningAutoPrepVisible: boolean;
}): boolean {
  if (input.morningAutoPrepVisible) {
    return true;
  }
  return shouldRenderLatentSuggestionLayers(input.frame);
}
