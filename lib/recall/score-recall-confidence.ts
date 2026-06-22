import type { RecallTrigger } from "@/lib/recall/recall-types";
import type { RecallEventSnapshot } from "@/lib/recall/recall-event-snapshot";
import type { RecallTriggerMatch } from "@/lib/recall/recall-trigger-matchers";

const MEANING_BOOST_TRIGGERS = new Set<RecallTrigger>([
  "same_person",
  "same_place",
  "same_city",
  "same_calendar_event",
  "context_note_echo",
]);

export function recallMatchesAllowMeaningBoost(
  matches: readonly RecallTriggerMatch[],
): boolean {
  return matches.some((row) => MEANING_BOOST_TRIGGERS.has(row.trigger));
}

/** Composite 0–100 confidence from trigger weights + past signal. */
export function scoreRecallConfidence(
  matches: readonly RecallTriggerMatch[],
  past: RecallEventSnapshot,
  now = new Date(),
  meaningWeight = 0,
): number {
  if (matches.length === 0) {
    return 0;
  }

  let score = matches.reduce((sum, row) => sum + row.weight, 0);

  if (matches.length >= 2) {
    score += 12;
  }
  if (matches.length >= 3) {
    score += 8;
  }

  if (past.captureCount > 0) {
    score += Math.min(15, past.captureCount * 3);
  }

  if (past.lifecycle === "completed") {
    score += 8;
  }

  if (past.atIso) {
    const ms = Date.parse(past.atIso);
    if (!Number.isNaN(ms)) {
      const yearsAgo = (now.getTime() - ms) / (365.25 * 86_400_000);
      if (yearsAgo >= 0.25 && yearsAgo <= 5) {
        score += 10;
      }
    }
  }

  if (meaningWeight > 0 && recallMatchesAllowMeaningBoost(matches)) {
    score += Math.min(20, Math.round(meaningWeight * 0.2));
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}
