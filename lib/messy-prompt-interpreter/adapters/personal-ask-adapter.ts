import { interpretMessyPromptHybrid } from "@/lib/messy-prompt-interpreter/interpret-messy-prompt-hybrid";
import { refineMessageForPipeline } from "@/lib/messy-prompt-interpreter/refine-message-for-pipeline";
import { shouldInterpretMessyInput } from "@/lib/messy-prompt-interpreter/should-interpret-messy-input";
import type { InterpretAndExecuteResult } from "@/lib/messy-prompt-interpreter/types";

export type PersonalAskInterpretInput = {
  messyInput: string;
  scope?: "personal" | "discovery";
  lat?: number | null;
  lng?: number | null;
  useLlm?: boolean;
  onUnderstanding?: (line: string, stage: "rules" | "llm") => void;
};

export type PersonalAskInterpretResult = {
  refinedMessage: string;
  understandingKo: string | null;
  interpretation: InterpretAndExecuteResult | null;
};

function buildPersonalAskSituation(
  input: PersonalAskInterpretInput,
): Record<string, string | number | boolean | null> {
  const situation: Record<string, string | number | boolean | null> = {
    surface: "personal_ask",
    scope: input.scope ?? "personal",
  };
  if (typeof input.lat === "number" && Number.isFinite(input.lat)) {
    situation.userLat = input.lat;
  }
  if (typeof input.lng === "number" && Number.isFinite(input.lng)) {
    situation.userLng = input.lng;
  }
  return situation;
}

/** Capture ask sheet — messy NL → refined recall query. */
export async function interpretMessyForPersonalAsk(
  input: PersonalAskInterpretInput,
): Promise<PersonalAskInterpretResult> {
  const trimmed = input.messyInput.trim();
  if (!shouldInterpretMessyInput(trimmed)) {
    return {
      refinedMessage: trimmed,
      understandingKo: null,
      interpretation: null,
    };
  }

  const interpretation = await interpretMessyPromptHybrid(trimmed, {
    situation: buildPersonalAskSituation(input),
    useLlm: input.useLlm,
    onStage: (stageResult, stage) => {
      const line = stageResult.plan.understandingKo.trim();
      if (line) {
        input.onUnderstanding?.(line, stage);
      }
    },
  });

  const refinedMessage = refineMessageForPipeline(trimmed, interpretation);
  const understandingKo =
    refinedMessage !== trimmed ? interpretation.plan.understandingKo.trim() : null;

  return {
    refinedMessage,
    understandingKo,
    interpretation,
  };
}
