import { interpretMessyPromptHybrid } from "@/lib/messy-prompt-interpreter/interpret-messy-prompt-hybrid";
import { refineMessageForPipeline } from "@/lib/messy-prompt-interpreter/refine-message-for-pipeline";
import { shouldInterpretMessyInput } from "@/lib/messy-prompt-interpreter/should-interpret-messy-input";
import type { InterpretAndExecuteResult } from "@/lib/messy-prompt-interpreter/types";

export type ContextAgentInterpretInput = {
  messyInput: string;
  contextEventId: string;
  anchorPlaceName?: string | null;
  anchorLat?: number | null;
  anchorLng?: number | null;
  useLlm?: boolean;
};

export type ContextAgentInterpretResult = {
  refinedMessage: string;
  understandingKo: string | null;
  interpretation: InterpretAndExecuteResult | null;
};

function buildContextSituation(
  input: ContextAgentInterpretInput,
): Record<string, string | number | boolean | null> {
  const situation: Record<string, string | number | boolean | null> = {
    surface: "context_agent",
    contextEventId: input.contextEventId.trim(),
  };
  const anchor = input.anchorPlaceName?.trim();
  if (anchor) {
    situation.anchorPlaceName = anchor;
  }
  if (typeof input.anchorLat === "number" && Number.isFinite(input.anchorLat)) {
    situation.anchorLat = input.anchorLat;
  }
  if (typeof input.anchorLng === "number" && Number.isFinite(input.anchorLng)) {
    situation.anchorLng = input.anchorLng;
  }
  return situation;
}

/** Context-bound agent — keep typed NL; do not publish rewrite into chat. */
export async function interpretMessyForContextAgent(
  input: ContextAgentInterpretInput,
): Promise<ContextAgentInterpretResult> {
  const trimmed = input.messyInput.trim();
  if (!shouldInterpretMessyInput(trimmed)) {
    return {
      refinedMessage: trimmed,
      understandingKo: null,
      interpretation: null,
    };
  }

  const interpretation = await interpretMessyPromptHybrid(trimmed, {
    situation: buildContextSituation(input),
    useLlm: input.useLlm,
  });

  void refineMessageForPipeline(trimmed, interpretation);

  return {
    refinedMessage: trimmed,
    understandingKo: null,
    interpretation,
  };
}
