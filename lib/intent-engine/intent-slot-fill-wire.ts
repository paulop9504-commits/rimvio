import { INTENT_LIBRARY } from "@/lib/intent-engine/intent-library";
import type { ParsedIntentHit } from "@/lib/intent-engine/types";

/** Closed wire — LLM may only emit Intent Library ids. Never invent rows. */
export type IntentSlotFillWire = {
  library_ids: string[];
  confidence?: number;
  missing_information?: string[];
  follow_up_questions?: string[];
};

export const INTENT_LIBRARY_IDS = INTENT_LIBRARY.map((row) => row.id);

const LIBRARY_ID_SET = new Set(INTENT_LIBRARY_IDS);

export function isIntentLibraryId(id: string): boolean {
  return LIBRARY_ID_SET.has(id);
}

export function validateIntentSlotFillWire(wire: IntentSlotFillWire): string[] {
  const failures: string[] = [];
  if (!Array.isArray(wire.library_ids)) {
    failures.push("library_ids must be an array");
    return failures;
  }
  for (const id of wire.library_ids) {
    if (typeof id !== "string" || !isIntentLibraryId(id)) {
      failures.push(`unknown library_id: ${String(id)}`);
    }
  }
  if (wire.confidence != null) {
    if (typeof wire.confidence !== "number" || wire.confidence < 0 || wire.confidence > 1) {
      failures.push("confidence must be 0–1");
    }
  }
  return failures;
}

export function parseIntentSlotFillWire(raw: string): IntentSlotFillWire | null {
  try {
    const parsed = JSON.parse(raw) as Partial<IntentSlotFillWire>;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    const library_ids = Array.isArray(parsed.library_ids)
      ? parsed.library_ids.filter((id): id is string => typeof id === "string")
      : [];
    const wire: IntentSlotFillWire = {
      library_ids,
      confidence:
        typeof parsed.confidence === "number" ? parsed.confidence : undefined,
      missing_information: Array.isArray(parsed.missing_information)
        ? parsed.missing_information.filter((x): x is string => typeof x === "string")
        : undefined,
      follow_up_questions: Array.isArray(parsed.follow_up_questions)
        ? parsed.follow_up_questions.filter((x): x is string => typeof x === "string")
        : undefined,
    };
    if (validateIntentSlotFillWire(wire).length > 0) {
      return null;
    }
    return wire;
  } catch {
    return null;
  }
}

/** Drop unknown ids — keep only closed library rows. */
export function sanitizeIntentSlotFillWire(
  wire: IntentSlotFillWire,
): IntentSlotFillWire {
  return {
    ...wire,
    library_ids: [...new Set(wire.library_ids.filter(isIntentLibraryId))],
  };
}

export function wireToParsedIntentHits(
  wire: IntentSlotFillWire,
): ParsedIntentHit[] {
  const safe = sanitizeIntentSlotFillWire(wire);
  const confidence =
    typeof safe.confidence === "number"
      ? Math.max(0.55, Math.min(0.85, safe.confidence))
      : 0.72;

  const hits: ParsedIntentHit[] = [];
  for (const id of safe.library_ids) {
    const entry = INTENT_LIBRARY.find((row) => row.id === id);
    if (!entry) {
      continue;
    }
    hits.push({
      libraryId: entry.id,
      category: entry.category,
      labelKo: entry.labelKo,
      factKind: "inferred",
      confidence,
      cue: "llm_slot_fill",
    });
  }
  return hits;
}
