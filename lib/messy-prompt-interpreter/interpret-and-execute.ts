import { buildMessyPromptIR } from "@/lib/messy-prompt-interpreter/build-messy-prompt-ir";
import {
  buildClarifications,
  buildExecutionPlan,
} from "@/lib/messy-prompt-interpreter/build-execution-plan";
import { extractMessyIntentHybrid } from "@/lib/messy-prompt-interpreter/extract-messy-intent-llm";
import { normalizeMessyInput } from "@/lib/messy-prompt-interpreter/normalize-messy-input";
import {
  DEFAULT_INTERPRETER_EXECUTORS,
  runInterpreterExecutors,
} from "@/lib/messy-prompt-interpreter/interpreter-executors";
import { renderInterpreterVisualization } from "@/lib/messy-prompt-interpreter/render-visualization";
import type {
  InterpretAndExecuteOptions,
  InterpretAndExecuteResult,
} from "@/lib/messy-prompt-interpreter/types";

/**
 * Messy Prompt Interpreter — main entry.
 *
 * Pipeline:
 *   messy NL → normalize → intent extract (rules ± LLM) → IR → plan → execute → visualize
 */
export async function interpretAndExecute(
  messyInput: string,
  options: InterpretAndExecuteOptions = {},
): Promise<InterpretAndExecuteResult> {
  const trimmed = messyInput.trim();
  const { normalized } = normalizeMessyInput(trimmed);

  if (!trimmed) {
    throw new Error("messyInput is empty");
  }

  const extracted = await extractMessyIntentHybrid(
    {
      message: trimmed,
      situation: options.situation,
      clock: options.clock,
    },
    { useLlm: options.useLlm },
  );

  const ir =
    extracted.ir ??
    buildMessyPromptIR({
      ...extracted.intent,
      assumptions: [
        ...extracted.intent.assumptions,
        ...(extracted.source === "rules"
          ? ["규칙 기반 해석 — LLM 미사용 또는 실패"]
          : []),
      ],
    });

  if (options.situation) {
    for (const [key, value] of Object.entries(options.situation)) {
      if (ir.state[key] == null) {
        ir.state[key] = value;
      }
    }
  }

  const plan = buildExecutionPlan(extracted.intent, ir);
  const clarifications = buildClarifications(extracted.intent);
  const visualization = renderInterpreterVisualization(ir, plan);

  const blocking = clarifications.find((q) => !q.optional);
  const ctx = {
    messyInput: trimmed,
    intent: extracted.intent,
    ir,
    plan,
  };

  let execution = null;
  if (!options.dryRun) {
    if (blocking && extracted.intent.confidence < 0.5) {
      execution = {
        executorId: "clarification_gate",
        status: "needs_input" as const,
        outputKo: blocking.promptKo,
        payload: { questionId: blocking.id },
      };
    } else {
      execution = await runInterpreterExecutors(
        ctx,
        options.executors ?? DEFAULT_INTERPRETER_EXECUTORS,
      );
    }
  }

  return {
    messyInput: trimmed,
    normalizedInput: normalized,
    source: extracted.source,
    intent: extracted.intent,
    ir,
    plan,
    clarifications,
    visualization,
    execution,
  };
}
