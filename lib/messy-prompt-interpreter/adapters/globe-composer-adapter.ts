import { interpretMessyPrompt } from "@/lib/messy-prompt-interpreter/interpret-messy-prompt";
import { refineMessageForPipeline } from "@/lib/messy-prompt-interpreter/refine-message-for-pipeline";
import { shouldInterpretMessyInput } from "@/lib/messy-prompt-interpreter/should-interpret-messy-input";
import type { InterpretAndExecuteResult } from "@/lib/messy-prompt-interpreter/types";

export type GlobeComposerInterpretInput = {
  messyInput: string;
  contextEventId?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export type GlobeComposerInterpretResult = {
  dispatchText: string;
  understandingKo: string | null;
  interpretation: InterpretAndExecuteResult | null;
};

function buildGlobeSituation(
  input: GlobeComposerInterpretInput,
): Record<string, string | number | boolean | null> {
  const situation: Record<string, string | number | boolean | null> = {
    surface: "globe_composer",
  };
  const eventId = input.contextEventId?.trim();
  if (eventId) {
    situation.contextEventId = eventId;
  }
  if (typeof input.lat === "number" && Number.isFinite(input.lat)) {
    situation.userLat = input.lat;
  }
  if (typeof input.lng === "number" && Number.isFinite(input.lng)) {
    situation.userLng = input.lng;
  }
  return situation;
}

/** Globe composer — messy NL → refined dispatch text + optional understanding line. */
export async function interpretMessyForGlobeComposer(
  input: GlobeComposerInterpretInput,
): Promise<GlobeComposerInterpretResult> {
  const trimmed = input.messyInput.trim();
  if (!shouldInterpretMessyInput(trimmed)) {
    return {
      dispatchText: trimmed,
      understandingKo: null,
      interpretation: null,
    };
  }

  const interpretation = await interpretMessyPrompt(trimmed, {
    situation: buildGlobeSituation(input),
    useLlm: false,
  });

  const dispatchText = refineMessageForPipeline(trimmed, interpretation);
  const understandingKo =
    dispatchText !== trimmed ? interpretation.plan.understandingKo.trim() : null;

  return {
    dispatchText,
    understandingKo,
    interpretation,
  };
}
