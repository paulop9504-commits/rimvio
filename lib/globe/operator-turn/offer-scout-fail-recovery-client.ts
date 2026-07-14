"use client";

/**
 * Gap 6 — scout fail → one soft retry; reject streak → one re-scout.
 * Does not auto-Commit. Still one Act per system fire (Operator bridge).
 * Seeds preserve last user intent (hostel · price) via domain-cue recovery.
 */

import { appendContextAgentComposeTurn } from "@/lib/globe/assistant";
import { recordPlanSequencerProgress } from "@/lib/context-execution/record-plan-sequencer-progress";
import type { RimvioEngineId } from "@/lib/engine/engine-types";
import { resolveScoutRecoverySeed } from "@/lib/globe/domain-cues/resolve-scout-recovery-seed";
import { requestOperatorAutoRun } from "@/lib/globe/operator-turn/operator-auto-run-bridge";
import { countDiscoveryFeedRejectSignals } from "@/lib/globe/intelligent-pin/record-discovery-feed-scroll-signal";

const scoutFailRetried = new Set<string>();
const rejectRescouted = new Set<string>();

const REJECT_RESCOUT_THRESHOLD = 3;

function failKey(contextEventId: string, engineId: RimvioEngineId): string {
  return `${contextEventId.trim()}::${engineId}`;
}

/**
 * After scout_failed — one auto retry with widened prior intent; then chips stay on compose.
 */
export function offerScoutFailRecovery(input: {
  contextEventId: string;
  engineId: RimvioEngineId;
  seedUtterance?: string | null;
  lastError: string;
}): boolean {
  const contextEventId = input.contextEventId.trim();
  if (!contextEventId) {
    return false;
  }
  const key = failKey(contextEventId, input.engineId);
  if (scoutFailRetried.has(key)) {
    appendContextAgentComposeTurn(contextEventId, {
      role: "assistant",
      kind: "text",
      text: "후보가 비었어요 — 조건을 조금 바꿔 다시 말해 주세요.",
    });
    recordPlanSequencerProgress({
      contextEventId,
      engineId: input.engineId,
      phase: "blocked_retry",
      detailKo: "재시도 후에도 비어 조건을 기다려요",
    });
    return false;
  }
  scoutFailRetried.add(key);
  const seed = resolveScoutRecoverySeed({
    contextEventId,
    engineId: input.engineId,
    seedUtterance: input.seedUtterance,
  });
  const progressKo = "범위를 넓혀 다시 맞추는 중이에요…";
  appendContextAgentComposeTurn(contextEventId, {
    role: "assistant",
    kind: "text",
    text: progressKo,
  });
  recordPlanSequencerProgress({
    contextEventId,
    engineId: input.engineId,
    phase: "scout_retry",
    detailKo: `${progressKo} (${input.lastError})`,
  });
  requestOperatorAutoRun({
    contextEventId,
    text: seed,
    source: "scout_retry",
    progressKo,
  });
  return true;
}

/**
 * Fast-scroll reject streak → one re-scout Act (ranking already nudges; this reloads batch).
 */
export function maybeOfferRejectRescout(input: {
  contextEventId: string;
  /** Seed utterance for domain — default lodging/eatery-aware from last user compose if omitted. */
  seedUtterance?: string | null;
  engineId?: RimvioEngineId | null;
}): boolean {
  const contextEventId = input.contextEventId.trim();
  if (!contextEventId) {
    return false;
  }
  const rejects = countDiscoveryFeedRejectSignals(contextEventId);
  if (rejects < REJECT_RESCOUT_THRESHOLD) {
    return false;
  }
  if (rejectRescouted.has(contextEventId)) {
    return false;
  }
  rejectRescouted.add(contextEventId);
  const engineId = input.engineId ?? "lodging_search";
  const seed = resolveScoutRecoverySeed({
    contextEventId,
    engineId,
    seedUtterance: input.seedUtterance,
  });
  const progressKo = "넘겨 보신 쪽으로 맞춰 다시 찾는 중이에요…";
  appendContextAgentComposeTurn(contextEventId, {
    role: "assistant",
    kind: "text",
    text: progressKo,
  });
  recordPlanSequencerProgress({
    contextEventId,
    engineId,
    phase: "scout_retry",
    detailKo: progressKo,
  });
  requestOperatorAutoRun({
    contextEventId,
    text: seed,
    source: "reject_rescout",
    progressKo,
  });
  return true;
}

/** Test helper */
export function resetScoutRecoveryMemoryForTests(): void {
  scoutFailRetried.clear();
  rejectRescouted.clear();
}
