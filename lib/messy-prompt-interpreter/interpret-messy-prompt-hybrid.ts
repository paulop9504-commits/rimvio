import { fetchMessyPromptInterpretationClient } from "@/lib/messy-prompt-interpreter/fetch-messy-prompt-interpretation-client";
import { interpretMessyPrompt } from "@/lib/messy-prompt-interpreter/interpret-messy-prompt";
import type { InterpretAndExecuteResult } from "@/lib/messy-prompt-interpreter/types";

const DEFAULT_LLM_RACE_MS = 750;

export type InterpretMessyHybridOptions = {
  situation?: Record<string, string | number | boolean | null>;
  /** Try server LLM when in browser. Default true. */
  useLlm?: boolean;
  /** Max wait for LLM before falling back to rules for execution. */
  llmRaceMs?: number;
  /** Fired when rules land (instant) and when LLM upgrades understanding. */
  onStage?: (
    result: InterpretAndExecuteResult,
    stage: "rules" | "llm",
  ) => void;
};

function shouldPreferLlm(
  rules: InterpretAndExecuteResult,
  llm: InterpretAndExecuteResult,
): boolean {
  if (llm.source === "llm" || llm.source === "hybrid") {
    return llm.intent.confidence >= rules.intent.confidence - 0.04;
  }
  return llm.intent.confidence > rules.intent.confidence + 0.06;
}

/**
 * Cursor-style hybrid — rules instantly, LLM races in parallel (≤ race window).
 * Late LLM may still upgrade UI via onStage without blocking execution.
 */
export async function interpretMessyPromptHybrid(
  messyInput: string,
  options: InterpretMessyHybridOptions = {},
): Promise<InterpretAndExecuteResult> {
  const trimmed = messyInput.trim();
  const situation = options.situation;
  const useLlm = options.useLlm !== false && typeof window !== "undefined";
  const raceMs = options.llmRaceMs ?? DEFAULT_LLM_RACE_MS;

  const rulesPromise = interpretMessyPrompt(trimmed, { situation, useLlm: false });

  if (!useLlm) {
    const rules = await rulesPromise;
    options.onStage?.(rules, "rules");
    return rules;
  }

  const startedAt = Date.now();
  const llmPromise = fetchMessyPromptInterpretationClient({
    message: trimmed,
    situation,
  }).catch(() => null);

  const rules = await rulesPromise;
  options.onStage?.(rules, "rules");

  const remaining = Math.max(0, raceMs - (Date.now() - startedAt));
  const llm =
    remaining > 0
      ? await Promise.race([
          llmPromise,
          new Promise<null>((resolve) => {
            window.setTimeout(() => resolve(null), remaining);
          }),
        ])
      : null;

  if (llm && shouldPreferLlm(rules, llm)) {
    options.onStage?.(llm, "llm");
    return llm;
  }

  void llmPromise.then((late) => {
    if (late && shouldPreferLlm(rules, late)) {
      options.onStage?.(late, "llm");
    }
  });

  return rules;
}
