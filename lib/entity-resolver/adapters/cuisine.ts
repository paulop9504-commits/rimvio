import {
  parseCuisineCandidates,
  type CuisineCandidate,
} from "@/lib/globe/context-condition-ai/parse-cuisine-candidates";
import {
  MATCHA_CANDIDATES_BARE,
  semanticPathForCuisine,
} from "@/lib/entity-resolver/semantic-layer";
import type {
  EntityKind,
  EntityKindCandidate,
  ResolvedEntity,
} from "@/lib/entity-resolver/types";
import { ENTITY_AMBIGUITY_GAP } from "@/lib/entity-resolver/types";

function kindForCuisine(candidate: CuisineCandidate): EntityKind {
  if (candidate.id === "matcha_icecream" || candidate.id === "kakigori") {
    return "Dessert";
  }
  if (
    candidate.id === "cafe" ||
    candidate.id === "beverage" ||
    candidate.id === "juice"
  ) {
    return "Drink";
  }
  if (candidate.id === "dessert") {
    return "Dessert";
  }
  if (candidate.id === "matcha") {
    return "Food";
  }
  return "Food";
}

function findSpan(text: string, label: string): { start: number; end: number } {
  const idx = text.toLowerCase().indexOf(label.toLowerCase().slice(0, Math.min(2, label.length)));
  // Prefer exact query fragment
  for (const token of label.split(/\s+/u)) {
    if (token.length < 2) {
      continue;
    }
    const at = text.indexOf(token);
    if (at >= 0) {
      return { start: at, end: at + token.length };
    }
  }
  return { start: Math.max(0, idx), end: Math.max(1, idx + label.length) };
}

/** Cuisine / dish NER → ResolvedEntity (matcha context applied here). */
export function resolveCuisineEntities(text: string): ResolvedEntity[] {
  const candidates = parseCuisineCandidates(text);
  if (candidates.length === 0) {
    return [];
  }

  const iceCreamCue =
    /아이스\s*크림|아이스크림|소프트|젤라토|ice\s*cream|デザート|디저트/iu.test(
      text,
    );

  const out: ResolvedEntity[] = [];
  for (const candidate of candidates) {
    let kind = kindForCuisine(candidate);
    let confidence = 0.9;
    let kindCandidates: EntityKindCandidate[] | undefined;

    if (candidate.id === "matcha") {
      if (iceCreamCue) {
        kind = "Dessert";
        confidence = 0.92;
      } else {
        kindCandidates = MATCHA_CANDIDATES_BARE;
        const top = kindCandidates[0];
        const second = kindCandidates[1];
        kind = top?.kind ?? "Drink";
        confidence = top?.confidence ?? 0.52;
        if (
          top &&
          second &&
          top.confidence - second.confidence < ENTITY_AMBIGUITY_GAP + 0.01
        ) {
          // Keep candidates for planner chips
        } else {
          kindCandidates = undefined;
        }
      }
    }

    if (candidate.id === "matcha_icecream") {
      kind = "Dessert";
      confidence = 0.95;
      kindCandidates = undefined;
    }

    const span = findSpan(text, candidate.queryKo);
    out.push({
      id: `cuisine:${candidate.id}`,
      kind,
      label: candidate.labelKo,
      aliases: [candidate.queryKo],
      semanticPath: semanticPathForCuisine({ cuisineId: candidate.id, kind }),
      confidence,
      source: iceCreamCue && candidate.id === "matcha" ? "context" : "dictionary",
      span,
      queryFocus: candidate.queryKo,
      candidates: kindCandidates,
    });
  }
  return out;
}
