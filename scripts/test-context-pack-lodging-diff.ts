#!/usr/bin/env npx tsx
/**
 * Context Pack lodging Diff — every turn carries selected stay · guests · lastBatch
 * so 「더 싸게」「하루 늘려」 apply to the same project.
 */

import assert from "node:assert/strict";
import {
  buildContextPack,
  clearLastContextPack,
  readLastContextPack,
  resolveLodgingDiffForPack,
  writeLastContextPack,
} from "../lib/context-builder";
import {
  clearSessionGraphs,
  resetGraphCommandStoreForTests,
  tryRunGraphCommandOs,
} from "../lib/graph-command";
import { writeContextConditionLastBatch } from "../lib/globe/context-condition-ai/context-condition-last-batch-store";
import { clearContextConditionLastBatch } from "../lib/globe/context-condition-ai/context-condition-last-batch-store";
import {
  classifyIntentFamily,
} from "../lib/rule-engine/classify-intent-family";
import {
  parseRelativeNightDelta,
  tryParseLodgingStayRevise,
} from "../lib/globe/context-hub/parse-lodging-stay-revise";
import { runNaturalLanguagePipeline } from "../lib/context-run/run-natural-language-pipeline";
import { clearPreparedRealityOperations } from "../lib/reality-queue";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";
import { clearLodgingStayRevisePending } from "../lib/globe/context-hub/lodging-stay-revise-pending-store";
import { parsePalantirFacetFromMessage } from "../lib/globe/spatial-semantic/resolve-palantir-refine-intent";

const EVENT_ID = "evt-pack-diff";

resetGraphCommandStoreForTests();
clearPreparedRealityOperations();
clearSessionGraphs();
clearLastContextPack(EVENT_ID);
clearContextConditionLastBatch(EVENT_ID);
clearLodgingStayRevisePending(EVENT_ID);

commitEventUpsert({
  id: EVENT_ID,
  title: "오사카 여행",
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
  contextLabelKo: "오사카",
});

writeContextConditionLastBatch(EVENT_ID, {
  batchId: "tool-search:evt-pack-diff:1",
  count: 1,
  summaryKo: "숙소",
  atIso: new Date().toISOString(),
  triggerMessage: "APA호텔 찾아줘",
  recommendations: [
    {
      kind: "lodging",
      title: "APA Hotel Osaka",
      reasonKo: "검색",
      placeId: "apa-namba",
      lat: 34.6654,
      lng: 135.5019,
    },
  ],
});

{
  const lodgingDiff = resolveLodgingDiffForPack({
    contextEventId: EVENT_ID,
    graph: null,
    previous: null,
  });
  // graph null — still get slots from event
  assert.ok(lodgingDiff);
  assert.equal(lodgingDiff!.nights, 4);
  assert.equal(lodgingDiff!.guestCount, 2);
  assert.ok(lodgingDiff!.lastBatchId?.startsWith("tool-search:"));
}

{
  const turn1 = runNaturalLanguagePipeline({
    utterance: "APA호텔 찾아줘",
    contextEventId: EVENT_ID,
    anchorLat: 34.6654,
    anchorLng: 135.5019,
  });
  assert.ok(turn1.trace.contextPack.lodgingDiff);
  assert.equal(turn1.trace.contextPack.lodgingDiff!.nights, 4);
  assert.equal(turn1.trace.contextPack.lodgingDiff!.guestCount, 2);
  assert.ok(turn1.trace.contextPack.lodgingDiff!.selectedLodgingLabelKo);

  const packed = readLastContextPack(EVENT_ID);
  assert.ok(packed?.lodgingDiff?.nights === 4);

  // Turn 2 — soft follow-up must keep Diff
  const turn2 = runNaturalLanguagePipeline({
    utterance: "더 싸게",
    contextEventId: EVENT_ID,
  });
  assert.ok(turn2.trace.contextPack.lodgingDiff);
  assert.equal(turn2.trace.contextPack.lodgingDiff!.nights, 4);
  assert.equal(
    turn2.trace.contextPack.lodgingDiff!.selectedLodgingId,
    turn1.trace.contextPack.lodgingDiff!.selectedLodgingId,
  );
  assert.equal(turn2.trace.deferredToScout, true);
  assert.equal(turn2.result?.via, "scout_handoff");
  assert.equal(parsePalantirFacetFromMessage("더 싸게"), "price");
}

{
  assert.equal(classifyIntentFamily("하루 늘려"), "Revise");
  assert.equal(parseRelativeNightDelta("하루 늘려"), 1);
  assert.equal(parseRelativeNightDelta("이틀 줄여"), -2);

  const packed = readLastContextPack(EVENT_ID);
  const proposal = tryParseLodgingStayRevise({
    text: "하루 늘려",
    event: null,
    lodgingDiff: packed?.lodgingDiff,
  });
  // event null but pack Diff has stay — still propose
  assert.ok(proposal);
  assert.equal(proposal!.previousNights, 4);
  assert.equal(proposal!.nights, 5);

  clearLodgingStayRevisePending(EVENT_ID);
  const revise = runNaturalLanguagePipeline({
    utterance: "하루 늘려",
    contextEventId: EVENT_ID,
  });
  assert.equal(revise.result?.via, "revise_confirm");
  assert.ok(revise.trace.contextPack.lodgingDiff?.nights === 4);
}

{
  // Carry-forward when rebuild without re-stating lodging
  const previous = readLastContextPack(EVENT_ID)?.lodgingDiff ?? null;
  const pack = buildContextPack({
    utterance: "응",
    graph: null,
    lodgingDiff: resolveLodgingDiffForPack({
      contextEventId: EVENT_ID,
      graph: null,
      previous,
    }),
  });
  writeLastContextPack({ ...pack, contextEventId: EVENT_ID });
  assert.equal(readLastContextPack(EVENT_ID)?.lodgingDiff?.guestCount, 2);
}

console.log("ok — context-pack-lodging-diff");
