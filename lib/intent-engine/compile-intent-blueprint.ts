import { composeIntents } from "@/lib/intent-engine/compose-intents";
import {
  fillIntentSlotsViaLlm,
  mergeIntentHits,
  needsIntentSlotLlmFill,
  type IntentSlotFillSource,
} from "@/lib/intent-engine/fill-intent-slots-llm";
import { getIntentLibraryEntry } from "@/lib/intent-engine/intent-library";
import type { IntentSlotFillWire } from "@/lib/intent-engine/intent-slot-fill-wire";
import { expandIntentSemantics } from "@/lib/intent-engine/semantic-expand";
import { parseIntents } from "@/lib/intent-engine/parse-intents";
import { resolveIntentConflicts } from "@/lib/intent-engine/resolve-conflicts";
import {
  INTENT_ENGINE_VERSION,
  type IntentBlueprint,
  type ParsedIntentHit,
} from "@/lib/intent-engine/types";

/**
 * Compile IntentBlueprint from pre-parsed hits (rules and/or LLM).
 */
export function compileIntentBlueprintFromHits(input: {
  text: string;
  hits: readonly ParsedIntentHit[];
  extraMissing?: readonly string[];
  extraFollowUps?: readonly string[];
}): IntentBlueprint {
  const sourceText = input.text.trim();
  const intents = expandIntentSemantics([...input.hits]);
  const composed = composeIntents(intents);

  const missing_information: string[] = [...(input.extraMissing ?? [])];
  const follow_up_questions: string[] = [...(input.extraFollowUps ?? [])];
  for (const intent of intents) {
    const entry = getIntentLibraryEntry(intent.libraryId);
    for (const miss of entry?.missingWhenAlone ?? []) {
      if (!missing_information.includes(miss)) {
        missing_information.push(miss);
      }
    }
    for (const q of entry?.followUpsWhenAlone ?? []) {
      if (!follow_up_questions.includes(q)) {
        follow_up_questions.push(q);
      }
    }
  }

  const resolved = resolveIntentConflicts({
    version: INTENT_ENGINE_VERSION,
    sourceText,
    intents,
    mood: composed.mood,
    style: composed.style,
    constraints: composed.constraints,
    priority: composed.priority,
    mergedProfile: composed.mergedProfile,
    confidence: composed.confidence,
    missing_information,
    follow_up_questions,
  });

  return {
    version: INTENT_ENGINE_VERSION,
    sourceText,
    intents,
    mood: resolved.mood,
    style: resolved.style,
    constraints: resolved.constraints,
    priority: resolved.priority,
    mergedProfile: resolved.mergedProfile,
    confidence: composed.confidence,
    missing_information: resolved.missing_information,
    follow_up_questions: resolved.follow_up_questions,
  };
}

/**
 * Deterministic V1 — regex Intent Library cues only.
 */
export function compileIntentBlueprint(input: {
  text: string;
}): IntentBlueprint {
  const sourceText = input.text.trim();
  const hits = parseIntents(sourceText);
  return compileIntentBlueprintFromHits({ text: sourceText, hits });
}

export type CompileIntentBlueprintViaLlmResult = {
  blueprint: IntentBlueprint;
  source: IntentSlotFillSource;
  wire: IntentSlotFillWire | null;
};

/**
 * Regex first; on miss, LLM slot filler → same IntentBlueprint schema.
 * Never invents library rows outside Intent Library.
 */
export async function compileIntentBlueprintViaLlm(
  input: {
    text: string;
    /** Force LLM even when regex hit (merge). Default: miss-only. */
    forceLlm?: boolean;
  },
  options?: {
    callJson?: (input: {
      systemPrompt: string;
      userText: string;
    }) => Promise<string | null>;
  },
): Promise<CompileIntentBlueprintViaLlmResult> {
  const sourceText = input.text.trim();
  const ruleHits = parseIntents(sourceText);
  const shouldFill =
    input.forceLlm === true || needsIntentSlotLlmFill({ text: sourceText, hits: ruleHits });

  if (!shouldFill) {
    return {
      blueprint: compileIntentBlueprintFromHits({ text: sourceText, hits: ruleHits }),
      source: ruleHits.length > 0 ? "rules" : "none",
      wire: null,
    };
  }

  const filled = await fillIntentSlotsViaLlm(sourceText, {
    callJson: options?.callJson,
  });
  const hits = mergeIntentHits(ruleHits, filled.hits);
  const source: IntentSlotFillSource =
    ruleHits.length > 0 && filled.hits.length > 0
      ? "rules+llm"
      : filled.hits.length > 0
        ? "llm"
        : ruleHits.length > 0
          ? "rules"
          : "none";

  return {
    blueprint: compileIntentBlueprintFromHits({
      text: sourceText,
      hits,
      extraMissing: filled.wire?.missing_information,
      extraFollowUps: filled.wire?.follow_up_questions,
    }),
    source,
    wire: filled.wire,
  };
}
