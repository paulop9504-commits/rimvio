#!/usr/bin/env npx tsx
/**
 * Remaining NL gaps — Revise tool null, re-search Tool path, pack placeIds,
 * ClarifyLess chips, projection bump.
 */

import assert from "node:assert/strict";
import {
  resolveToolIdForIntent,
  resolveLookupToolId,
  resolveClarifyLess,
  buildClarifyResumeUtterance,
} from "../lib/rule-engine";
import {
  bumpSessionGraphProjection,
  clearSessionGraphs,
  isSameProjectReSearchUtterance,
  parseGraphCommands,
  projectSessionGraphToBrainCandidates,
  readSessionGraph,
  resetGraphCommandStoreForTests,
  shouldDeferSearchProjectToDiscoveryScout,
  tryRunGraphCommandOs,
} from "../lib/graph-command";
import {
  clearLastContextPack,
  readLastContextPack,
  writeLastContextPack,
  resolveLodgingDiffForPack,
  buildContextPack,
} from "../lib/context-builder";
import { writeContextConditionLastBatch } from "../lib/globe/context-condition-ai/context-condition-last-batch-store";
import { clearContextConditionLastBatch } from "../lib/globe/context-condition-ai/context-condition-last-batch-store";
import { clearPreparedRealityOperations } from "../lib/reality-queue";
import { runNaturalLanguagePipeline } from "../lib/context-run/run-natural-language-pipeline";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";
import {
  clearLodgingStayRevisePending,
  writeLodgingStayRevisePending,
} from "../lib/globe/context-hub/lodging-stay-revise-pending-store";

assert.equal(resolveToolIdForIntent({ intent: "Revise" }), null);
assert.equal(resolveLookupToolId("lodging"), "hotel.lookup");
assert.equal(isSameProjectReSearchUtterance("다시 찾아줘"), true);

{
  const chips = resolveClarifyLess({
    intentLabelKo: "삭제",
    candidates: [
      { id: "1", labelKo: "A호텔" },
      { id: "2", labelKo: "B호텔" },
    ],
  });
  assert.equal(chips.kind, "clarify");
  if (chips.kind === "clarify") {
    assert.equal(chips.chips.length, 2);
  }
  assert.equal(
    buildClarifyResumeUtterance({
      originalUtterance: "예약해",
      pickedLabelKo: "A호텔",
    }),
    "A호텔 예약해",
  );
}

const EVENT_ID = "evt-nl-gaps";
resetGraphCommandStoreForTests();
clearPreparedRealityOperations();
clearSessionGraphs();
clearLastContextPack(EVENT_ID);
clearContextConditionLastBatch(EVENT_ID);
clearLodgingStayRevisePending(EVENT_ID);

commitEventUpsert({
  id: EVENT_ID,
  title: "오사카",
  category: "travel",
  source: "manual",
  lifecycle: "active",
  datetime: "2030-08-01T03:00:00.000Z",
  place: "오사카",
  metadata: {
    feedPlanEnabled: true,
    planWindowEndIso: "2030-08-05T03:00:00.000Z",
    planWindowConfidence: "confirmed",
    planNights: 4,
    contextLodgingGuestCount: 2,
    contextLodgingRoomCount: 1,
  },
});

tryRunGraphCommandOs({
  utterance: "APA호텔 찾아줘",
  contextEventId: EVENT_ID,
  anchorLat: 34.6654,
  anchorLng: 135.5019,
});

writeContextConditionLastBatch(EVENT_ID, {
  batchId: "tool-search:evt-nl-gaps:1",
  count: 1,
  summaryKo: "숙소",
  atIso: new Date().toISOString(),
  recommendations: [
    {
      kind: "lodging",
      title: "APA",
      reasonKo: "검색",
      placeId: "apa-1",
      lat: 34.66,
      lng: 135.5,
    },
  ],
});

{
  const diff = resolveLodgingDiffForPack({
    contextEventId: EVENT_ID,
    graph: readSessionGraph(EVENT_ID),
    previous: null,
  });
  assert.ok(diff);
  assert.ok(diff!.lastBatchPlaceIds.includes("apa-1"));
  assert.equal(diff!.selectedPinId, diff!.selectedLodgingId);
  assert.equal(diff!.nights, 4);

  const pack = buildContextPack({
    utterance: "다시 찾아줘",
    graph: readSessionGraph(EVENT_ID),
    lodgingDiff: diff,
  });
  writeLastContextPack(pack);
  assert.equal(
    shouldDeferSearchProjectToDiscoveryScout("다시 찾아줘", EVENT_ID),
    false,
  );
}

{
  bumpSessionGraphProjection(EVENT_ID);
  const graph = readSessionGraph(EVENT_ID);
  assert.ok(graph);
  const markers = projectSessionGraphToBrainCandidates(graph!);
  assert.ok(markers.length >= 1);
}

{
  writeLodgingStayRevisePending(EVENT_ID, {
    checkInIso: "2030-08-01T03:00:00.000Z",
    checkOutIso: "2030-08-06T03:00:00.000Z",
    guestCount: 2,
    roomCount: 1,
    nights: 5,
    previousNights: 4,
    previousGuestCount: 2,
    changed: { nights: true, guests: false },
    summaryKo: "4박5일 → 5박6일",
    confirmHintKo: "바꿀까요?",
  });
  const applied = runNaturalLanguagePipeline({
    utterance: "응",
    contextEventId: EVENT_ID,
  });
  assert.equal(applied.result?.via, "revise_applied");
  if (applied.result?.via === "revise_applied") {
    assert.equal(applied.result.requestDiffRescout, true);
    assert.equal(applied.result.skipFeedGate, true);
    assert.equal(applied.result.waitingCommit, false);
  }
}

// Move casual lexicon + Unknown recovery chips.
{
  clearSessionGraphs();
  resetGraphCommandStoreForTests();
  const moveCmds = parseGraphCommands("옮겨줘");
  // No selection → empty parse; Intent still Move; pipeline recovers with chips.
  assert.equal(moveCmds.length, 0);

  const named = parseGraphCommands("APA 난바를 여행 맥락으로 옮겨");
  assert.equal(named[0]?.op, "move_context");

  const casualNamed = parseGraphCommands("APA 난바 여기로 옮겨");
  assert.equal(casualNamed[0]?.op, "move_context");

  const unknown = runNaturalLanguagePipeline({
    utterance: "음 그냥",
    contextEventId: EVENT_ID,
  });
  assert.ok(unknown.result);
  assert.ok(
    unknown.result.via === "clarify" || unknown.result.via === "reason",
  );
  if (
    unknown.result.via === "clarify" ||
    unknown.result.via === "reason"
  ) {
    assert.ok((unknown.result.clarifyChips?.length ?? 0) >= 1);
  }

  const moveBare = runNaturalLanguagePipeline({
    utterance: "옮겨줘",
    contextEventId: EVENT_ID,
  });
  assert.equal(moveBare.result?.via, "clarify");
  if (moveBare.result?.via === "clarify") {
    assert.ok((moveBare.result.clarifyChips?.length ?? 0) >= 1);
  }
}

console.log("ok — nl-gaps-remaining");
