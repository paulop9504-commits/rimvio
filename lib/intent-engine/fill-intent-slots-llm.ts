import { callLlmTextJson } from "@/lib/llm/text-llm-client";
import {
  buildIntentSlotFillerUserPrompt,
  INTENT_SLOT_FILLER_SYSTEM_PROMPT,
} from "@/lib/intent-engine/intent-slot-filler-prompt";
import {
  parseIntentSlotFillWire,
  wireToParsedIntentHits,
  type IntentSlotFillWire,
} from "@/lib/intent-engine/intent-slot-fill-wire";
import { parseIntents } from "@/lib/intent-engine/parse-intents";
import type { ParsedIntentHit } from "@/lib/intent-engine/types";

export type IntentSlotFillSource = "rules" | "llm" | "rules+llm" | "none";

/** True when regex parser found nothing actionable for a non-empty utterance. */
export function needsIntentSlotLlmFill(input: {
  text: string;
  hits?: readonly ParsedIntentHit[];
}): boolean {
  const text = input.text.trim();
  if (text.length < 2) {
    return false;
  }
  const hits = input.hits ?? parseIntents(text);
  return hits.length === 0;
}

export type FillIntentSlotsResult = {
  hits: ParsedIntentHit[];
  wire: IntentSlotFillWire | null;
  source: IntentSlotFillSource;
};

/**
 * LLM slot filler — closed library_ids only → ParsedIntentHit[].
 * On failure returns empty hits (caller keeps rules blueprint).
 */
export async function fillIntentSlotsViaLlm(
  text: string,
  options?: {
    /** Injected for tests — bypasses network. */
    callJson?: (input: {
      systemPrompt: string;
      userText: string;
    }) => Promise<string | null>;
  },
): Promise<FillIntentSlotsResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { hits: [], wire: null, source: "none" };
  }

  const callJson = options?.callJson ?? callLlmTextJson;

  try {
    const raw = await callJson({
      systemPrompt: INTENT_SLOT_FILLER_SYSTEM_PROMPT,
      userText: buildIntentSlotFillerUserPrompt(trimmed),
      temperature: 0.15,
    });
    if (!raw) {
      return { hits: [], wire: null, source: "none" };
    }
    const wire = parseIntentSlotFillWire(raw);
    if (!wire) {
      return { hits: [], wire: null, source: "none" };
    }
    const hits = wireToParsedIntentHits(wire);
    return {
      hits,
      wire,
      source: hits.length > 0 ? "llm" : "none",
    };
  } catch {
    return { hits: [], wire: null, source: "none" };
  }
}

/** Merge regex + LLM hits — regex (explicit) wins on same libraryId. */
export function mergeIntentHits(
  ruleHits: readonly ParsedIntentHit[],
  llmHits: readonly ParsedIntentHit[],
): ParsedIntentHit[] {
  const byId = new Map<string, ParsedIntentHit>();
  for (const hit of llmHits) {
    byId.set(hit.libraryId, hit);
  }
  for (const hit of ruleHits) {
    byId.set(hit.libraryId, hit);
  }
  return [...byId.values()].sort((a, b) => b.confidence - a.confidence);
}
