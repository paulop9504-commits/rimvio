import type { IntentBlueprint } from "@/lib/intent-engine/types";

/** Expand search queries from Intent Blueprint + raw text (Stage 2). */
export function expandResearchQueries(input: {
  text: string;
  blueprint: IntentBlueprint | null;
}): string[] {
  const base = input.text.trim();
  const queries = new Set<string>();
  if (base) {
    queries.add(base);
  }
  const bp = input.blueprint;
  if (bp) {
    for (const mood of bp.mood) {
      if (mood !== "UNKNOWN") {
        queries.add(`${base} ${mood}`.trim());
      }
    }
    for (const style of bp.style.slice(0, 4)) {
      if (style !== "UNKNOWN") {
        queries.add(`${base} ${style}`.trim());
      }
    }
    for (const intent of bp.intents.slice(0, 3)) {
      queries.add(`${intent.labelKo} ${base}`.trim());
    }
    if (bp.mergedProfile.budget && bp.mergedProfile.budget !== "UNKNOWN") {
      queries.add(`${base} ${bp.mergedProfile.budget}`.trim());
    }
  }
  // Generic reliable axes
  if (base) {
    queries.add(`${base} 후기`);
    queries.add(`${base} 가격`);
  }
  return [...queries].filter(Boolean).slice(0, 12);
}
