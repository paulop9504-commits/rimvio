#!/usr/bin/env npx tsx
/**
 * Open lodgingDiff must reach hotel.lookup / booking.prepare / re-search seed.
 */

import assert from "node:assert/strict";
import {
  clearLastContextPack,
  mergeLodgingStayForToolInvoke,
  resolveLodgingStayForTools,
  writeLastContextPack,
  buildContextPack,
} from "../lib/context-builder";
import {
  clearSessionGraphs,
  parseGraphCommands,
  resetGraphCommandStoreForTests,
  ensureSessionGraph,
  writeSessionGraph,
  readSessionGraph,
} from "../lib/graph-command";
import { invokeRimvioTool } from "../lib/tool-registry";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";
import { writeContextConditionLastBatch } from "../lib/globe/context-condition-ai/context-condition-last-batch-store";
import { clearContextConditionLastBatch } from "../lib/globe/context-condition-ai/context-condition-last-batch-store";
import { classifyIntentFamily } from "../lib/rule-engine/classify-intent-family";
import { makeNodeFromLiveCandidate } from "../lib/action-planner/inject-live-search-candidate";

const EVENT_ID = "evt-diff-tools";

resetGraphCommandStoreForTests();
clearSessionGraphs();
clearLastContextPack(EVENT_ID);
clearContextConditionLastBatch(EVENT_ID);

commitEventUpsert({
  id: EVENT_ID,
  title: "오사카",
  category: "travel",
  source: "manual",
  lifecycle: "active",
  datetime: "2030-09-01T03:00:00.000Z",
  place: "오사카",
  metadata: {
    feedPlanEnabled: true,
    planWindowEndIso: "2030-09-04T03:00:00.000Z",
    planWindowConfidence: "confirmed",
    planNights: 3,
    contextLodgingGuestCount: 3,
    contextLodgingRoomCount: 1,
  },
});

const graph0 = ensureSessionGraph({
  contextEventId: EVENT_ID,
  anchorLat: 34.67,
  anchorLng: 135.5,
});
const node = makeNodeFromLiveCandidate({
  contextEventId: EVENT_ID,
  kind: "lodging",
  candidate: {
    id: "liteapi:apa-namba",
    labelKo: "APA 난바",
    rating: 4.4,
    walkMinutes: 5,
    reservable: true,
    source: "liteapi",
    lat: 34.665,
    lng: 135.502,
  },
});
writeSessionGraph({
  ...graph0,
  nodes: [node],
  selectionIds: [node.id],
  updatedAtIso: new Date().toISOString(),
});

writeContextConditionLastBatch(EVENT_ID, {
  batchId: "tool-search:evt-diff-tools:1",
  count: 1,
  summaryKo: "숙소",
  atIso: new Date().toISOString(),
  triggerMessage: "APA호텔 찾아줘",
  recommendations: [
    {
      kind: "lodging",
      title: "APA 난바",
      reasonKo: "검색",
      placeId: "apa-namba",
      lat: 34.665,
      lng: 135.502,
    },
  ],
});

const graph = readSessionGraph(EVENT_ID);
assert.ok(graph);

const pack = buildContextPack({
  utterance: "더 싸게",
  intent: classifyIntentFamily("더 싸게"),
  graph,
  lodgingDiff: {
    selectedLodgingId: node.id,
    selectedLodgingLabelKo: "APA 난바",
    selectedPinId: node.id,
    checkInIso: "2030-09-01T15:00:00.000Z",
    checkOutIso: "2030-09-04T11:00:00.000Z",
    nights: 3,
    guestCount: 3,
    roomCount: 1,
    lastBatchId: "tool-search:evt-diff-tools:1",
    lastBatchPlaceIds: ["apa-namba"],
    maxNightlyPriceKrw: null,
  },
});
writeLastContextPack(pack);

{
  const stay = resolveLodgingStayForTools(EVENT_ID);
  assert.equal(stay.guestCount, 3);
  assert.ok(stay.checkInIso?.startsWith("2030-09-01"));
  assert.equal(stay.searchQueryHint, "APA 난바");
}

{
  const merged = mergeLodgingStayForToolInvoke({
    contextEventId: EVENT_ID,
    guestCount: null,
  });
  assert.equal(merged.guestCount, 3);
}

{
  const prep = invokeRimvioTool("booking.prepare", {
    contextEventId: EVENT_ID,
    placeName: "APA 난바",
  });
  assert.equal(prep.meta?.guestCount, 3);
  assert.ok(
    typeof prep.meta?.checkInIso === "string" &&
      prep.meta.checkInIso.startsWith("2030-09-01"),
  );
}

{
  const cmds = parseGraphCommands("다시 찾아줘", graph);
  assert.equal(cmds[0]?.op, "search_project");
  if (cmds[0]?.op === "search_project") {
    assert.equal(cmds[0].domain, "lodging");
    assert.equal(cmds[0].query, "APA 난바");
  }
}

console.log("ok — lodging-diff-to-tools");
