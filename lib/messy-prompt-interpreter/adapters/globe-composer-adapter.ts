import { interpretMessyPromptHybrid } from "@/lib/messy-prompt-interpreter/interpret-messy-prompt-hybrid";
import { refineMessageForPipeline } from "@/lib/messy-prompt-interpreter/refine-message-for-pipeline";
import { shouldInterpretMessyInput } from "@/lib/messy-prompt-interpreter/should-interpret-messy-input";
import type { InterpretAndExecuteResult } from "@/lib/messy-prompt-interpreter/types";

export type GlobeComposerInterpretInput = {
  messyInput: string;
  contextEventId?: string | null;
  lat?: number | null;
  lng?: number | null;
  useLlm?: boolean;
  onUnderstanding?: (line: string, stage: "rules" | "llm") => void;
};

export type GlobeComposerInterpretResult = {
  /** Always the user's typed NL (Cursor-style). */
  dispatchText: string;
  /** Never rewrite the composer — IR stays off the chat path. */
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

/**
 * Globe composer — interpret messy NL for internal IR only.
 * Dispatch + chat always keep the original typed text.
 */
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

  const interpretation = await interpretMessyPromptHybrid(trimmed, {
    situation: buildGlobeSituation(input),
    useLlm: input.useLlm,
    // Do not surface rewrite lines into the composer (Cursor-style).
  });

  void refineMessageForPipeline(trimmed, interpretation);

  return {
    dispatchText: trimmed,
    understandingKo: null,
    interpretation,
  };
}
