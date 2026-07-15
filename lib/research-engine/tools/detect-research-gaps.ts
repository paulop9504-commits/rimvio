/**
 * Axis gaps derived from field-level missing evidence.
 * Prefer detectResearchMissingFields for surgical loops.
 */

import type { PersuasionContext } from "@/lib/research-engine/score-persuasion";
import type { RankedCandidate } from "@/engines/research/schema";
import type { ResearchToolGap } from "@/lib/research-engine/tools/types";
import {
  detectResearchMissingFields,
  fieldGapsToAxisGaps,
} from "@/lib/research-engine/tools/detect-research-missing-fields";

/**
 * Detect missing / weak persuasion axes on the best kept candidate.
 * Built from field gaps so 「리뷰 0 → 축 스킵」 instead becomes
 * missing:reviewCount → places_details.
 */
export function detectResearchGaps(input: {
  ranked: readonly RankedCandidate[];
  persuasionContext: PersuasionContext;
}): ResearchToolGap[] {
  const fields = detectResearchMissingFields(input);
  return fieldGapsToAxisGaps(fields);
}
