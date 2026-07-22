/**
 * Additive Resource rank boost from personal recall + archive rollup.
 * Never replaces inventory API results — score delta only.
 */

import { resolveRollupUserHistoryWeight } from "@/lib/action-decision/resolve-rollup-history-weight";
import {
  cosineSimilarity,
  embedMemoryText,
  tokenizeMemoryText,
} from "@/lib/personal-memory/hashed-embedding";

/** Cap so recall never overtakes live price/GPS axes. */
export const RECALL_RANK_BOOST_CAP = 48;

export function computeRecallRankBoost(input: {
  readonly resourceLabel: string;
  readonly placeLabel?: string | null;
  readonly recallPlaceNeedles?: readonly string[];
  readonly recallQuery?: string | null;
  readonly contextKey?: string | null;
  readonly actionId?: string | null;
}): number {
  const labelBlob = [input.resourceLabel, input.placeLabel]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (!labelBlob) {
    return 0;
  }

  let boost = 0;
  const needles = input.recallPlaceNeedles ?? [];
  const labelLower = labelBlob.toLowerCase();
  for (const needle of needles) {
    const n = needle.trim().toLowerCase();
    if (n.length >= 2 && labelLower.includes(n)) {
      boost += 18;
    }
  }

  const query = input.recallQuery?.trim() ?? "";
  if (query) {
    const sim = cosineSimilarity(
      embedMemoryText(query),
      embedMemoryText(labelBlob),
    );
    if (sim >= 0.28) {
      boost += Math.round(sim * 28);
    }
    const queryTokens = tokenizeMemoryText(query);
    for (const token of queryTokens) {
      if (labelLower.includes(token)) {
        boost += 4;
      }
    }
  }

  const historyWeight = resolveRollupUserHistoryWeight({
    contextKey: input.contextKey?.trim() || undefined,
    actionId: input.actionId?.trim() || "resource.recall",
    label: input.resourceLabel,
  });
  /** Reused context (archive rollup) — weight above neutral adds a little. */
  if (historyWeight > 0.55) {
    boost += Math.round((historyWeight - 0.5) * 40);
  }

  return Math.min(RECALL_RANK_BOOST_CAP, Math.max(0, boost));
}
