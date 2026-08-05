import type { InterpretAndExecuteResult } from "@/lib/messy-prompt-interpreter/types";

/**
 * Cursor-style: never replace the user's typed NL for dispatch / chat.
 * Messy IR (summaryKo · professionalRewrite) stays internal only.
 */
export function refineMessageForPipeline(
  messyInput: string,
  _result?: InterpretAndExecuteResult | null,
): string {
  return messyInput.trim();
}
