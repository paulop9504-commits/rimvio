import type { ContextLiveStreamRow } from "@/lib/dev/context-snapshot-types";

const RECALL_UTTERANCE =
  /(?:아까|방금|그때|전에|다시|기억|뭐\s*였|뭐더라|얘기(?:하)?(?:던|한)\s*거|다녀|어디)/u;

function turnHadMemoryHit(row: ContextLiveStreamRow): boolean {
  if (row.lineage.unifiedContext?.includes("ConversationMemory")) {
    return true;
  }
  return row.orchestratorTrace.some(
    (line) =>
      /conversationmemory|memoryhit|memory hit/i.test(line) ||
      line.includes("UnifiedContext · ConversationMemory"),
  );
}

export type RecallHitRateSummary = {
  hitRatePct: number | null;
  recallUtteranceCount: number;
  hitCount: number;
  memoryStoreCount: number;
};

/** Recall 적중률 — live stream recall utterances vs memory block in lineage. */
export function computeRecallHitRate(input: {
  liveStream: readonly ContextLiveStreamRow[];
  conversationMemoryCount: number;
}): RecallHitRateSummary {
  const recallRows = input.liveStream.filter((row) =>
    RECALL_UTTERANCE.test(row.userMessage),
  );
  const hitCount = recallRows.filter(turnHadMemoryHit).length;
  const recallUtteranceCount = recallRows.length;

  let hitRatePct: number | null = null;
  if (recallUtteranceCount > 0) {
    hitRatePct = Math.round((hitCount / recallUtteranceCount) * 100);
  } else if (input.conversationMemoryCount > 0 && input.liveStream.length > 0) {
    const anyMemory = input.liveStream.some(turnHadMemoryHit);
    hitRatePct = anyMemory ? 100 : 0;
  }

  return {
    hitRatePct,
    recallUtteranceCount,
    hitCount,
    memoryStoreCount: input.conversationMemoryCount,
  };
}
