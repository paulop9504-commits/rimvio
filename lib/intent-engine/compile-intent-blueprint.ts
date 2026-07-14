import { composeIntents } from "@/lib/intent-engine/compose-intents";
import { getIntentLibraryEntry } from "@/lib/intent-engine/intent-library";
import { expandIntentSemantics } from "@/lib/intent-engine/semantic-expand";
import { parseIntents } from "@/lib/intent-engine/parse-intents";
import { resolveIntentConflicts } from "@/lib/intent-engine/resolve-conflicts";
import {
  INTENT_ENGINE_VERSION,
  type IntentBlueprint,
} from "@/lib/intent-engine/types";

/**
 * Full Intent Engine pipeline (deterministic V1):
 * NL → Parser → Semantic → Composer → ConflictResolver → IntentBlueprint
 */
export function compileIntentBlueprint(input: {
  text: string;
}): IntentBlueprint {
  const sourceText = input.text.trim();
  const hits = parseIntents(sourceText);
  const intents = expandIntentSemantics(hits);
  const composed = composeIntents(intents);

  const missing_information: string[] = [];
  const follow_up_questions: string[] = [];
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
