/**
 * Exploration policy score nudge — rating center mass vs tail novelty.
 * @see docs/RIMVIO_EXPLORATION_POLICY.md
 */

import type { ExplorationPolicyKnobs } from "@/lib/globe/discovery-policy/apply-exploration-mode";

function labelBlob(parts: readonly (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** Deterministic score delta from exploration knobs (after base score). */
export function explorationScoreBias(input: {
  knobs: ExplorationPolicyKnobs;
  rating?: number | null;
  labels: readonly (string | null | undefined)[];
}): number {
  const blob = labelBlob(input.labels);
  let delta = 0;

  const rating = input.rating ?? 0;
  if (Number.isFinite(rating) && rating >= 4.2) {
    delta += Math.round(14 * (input.knobs.ratingWeight - 1));
  } else if (Number.isFinite(rating) && rating >= 3.8 && input.knobs.mode === "convergent") {
    delta += 4;
  }

  if (/로컬|현지|골목|숨은|골목길|hidden|secret|underground/iu.test(blob)) {
    delta += Math.round(18 * (input.knobs.noveltyWeight - 1));
  }
  if (/인기|관광|유명|랜드mark|verified/iu.test(blob) && input.knobs.mode === "convergent") {
    delta += 10;
  }
  if (input.knobs.mode === "diffuse" && /인기|관광|유명/u.test(blob)) {
    delta -= 6;
  }

  return delta;
}
