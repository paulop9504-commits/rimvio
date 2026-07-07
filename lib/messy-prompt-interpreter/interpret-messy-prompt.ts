import { interpretAndExecute } from "@/lib/messy-prompt-interpreter/interpret-and-execute";
import type {
  InterpretAndExecuteOptions,
  InterpretAndExecuteResult,
} from "@/lib/messy-prompt-interpreter/types";

export type InterpretMessyPromptOptions = Pick<
  InterpretAndExecuteOptions,
  "situation" | "clock" | "useLlm"
>;

/**
 * Shared interpret-only entry — normalize → intent → IR → plan (no executor).
 * Browser surfaces use interpretMessyPromptHybrid for rules + optional server LLM.
 */
export async function interpretMessyPrompt(
  messyInput: string,
  options: InterpretMessyPromptOptions = {},
): Promise<InterpretAndExecuteResult> {
  return interpretAndExecute(messyInput, {
    dryRun: true,
    useLlm: options.useLlm ?? false,
    situation: options.situation,
    clock: options.clock,
  });
}
