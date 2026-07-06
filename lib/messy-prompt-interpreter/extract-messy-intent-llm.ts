import { isOpenAiConfigured, openAiApiKey, openAiModel } from "@/lib/llm/openai-config";
import { extractMessyIntentHeuristic } from "@/lib/messy-prompt-interpreter/extract-messy-intent-heuristic";
import {
  buildMessyPromptUserPrompt,
  MESSY_PROMPT_INTERPRETER_SYSTEM_PROMPT,
} from "@/lib/messy-prompt-interpreter/messy-prompt-system-prompt";
import {
  llmWireToIntent,
  llmWireToIr,
  parseMessyPromptLlmWire,
} from "@/lib/messy-prompt-interpreter/parse-messy-prompt-wire";
import type {
  ExtractedMessyIntent,
  InterpretSource,
  MessyPromptExtractInput,
  MessyPromptIR,
} from "@/lib/messy-prompt-interpreter/types";

async function callOpenAiJson(userPrompt: string): Promise<string> {
  const { apiKey, model } = { apiKey: openAiApiKey(), model: openAiModel() };
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model ?? "gpt-4o-mini",
      temperature: 0.15,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: MESSY_PROMPT_INTERPRETER_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed (${response.status})`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Empty LLM response");
  }
  return content;
}

export type ExtractMessyIntentResult = {
  intent: ExtractedMessyIntent;
  ir: MessyPromptIR | null;
  source: InterpretSource;
};

/**
 * Hybrid extraction — rules always run; LLM may refine when configured.
 * When LLM succeeds, its IR fields override heuristic summary layers.
 */
export async function extractMessyIntentHybrid(
  input: MessyPromptExtractInput,
  options?: { useLlm?: boolean },
): Promise<ExtractMessyIntentResult> {
  const heuristic = extractMessyIntentHeuristic(input);
  const useLlm = options?.useLlm !== false;

  if (!useLlm || !isOpenAiConfigured()) {
    return { intent: heuristic, ir: null, source: "rules" };
  }

  try {
    const userPrompt = buildMessyPromptUserPrompt({
      message: input.message,
      normalized: heuristic.normalized,
      situation: input.situation,
    });
    const raw = await callOpenAiJson(userPrompt);
    const wire = parseMessyPromptLlmWire(raw);
    if (!wire) {
      return { intent: heuristic, ir: null, source: "rules" };
    }

    const llmIntent = llmWireToIntent(
      wire,
      heuristic.raw,
      heuristic.normalized,
    );
  // Merge: keep heuristic ambiguities/urgency when LLM is overconfident on messy input
    const intent: ExtractedMessyIntent = {
      ...llmIntent,
      urgency: heuristic.urgency,
      ambiguities:
        llmIntent.confidence > 0.85 ? heuristic.ambiguities : llmIntent.ambiguities,
      confidence: Math.max(heuristic.confidence, llmIntent.confidence * 0.92),
    };

    return {
      intent,
      ir: llmWireToIr(wire),
      source: "hybrid",
    };
  } catch {
    return { intent: heuristic, ir: null, source: "rules" };
  }
}
