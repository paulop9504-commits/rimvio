/**
 * Engine event timeline labels + merged Context hub strip rows.
 */

import assert from "node:assert/strict";
import {
  appendEngineEventToMetadata,
  readEngineEventsFromMetadata,
} from "../lib/engine/engine-event-metadata";
import { buildEngineEventTimelineRows } from "../lib/engine/format-engine-event-timeline";
import { buildContextHubTimelineRows } from "../lib/globe/context-hub/build-context-hub-timeline-rows";
import { createReserveAction } from "../lib/globe/resource/hub-action-record";

const metadata = appendEngineEventToMetadata({
  metadata: {},
  engineId: "lodging_search",
  kind: "scout_complete",
  executionNodeId: "lodging",
  payload: { pinCount: 3 },
});
const metadata2 = appendEngineEventToMetadata({
  metadata,
  engineId: "lodging_search",
  kind: "main_selected",
  executionNodeId: "lodging",
  payload: { placeId: "lp1" },
});

const events = readEngineEventsFromMetadata(metadata2);
assert.equal(events.length, 2);

const engineRows = buildEngineEventTimelineRows(events);
assert.equal(engineRows[0]?.labelKo, "숙소 고정");
assert.equal(engineRows[1]?.labelKo, "숙소 찾기");

const reserve = createReserveAction({
  contextEventId: "ctx-osaka",
  resourceId: "ctx-osaka:lodging:lp1",
  sourceHubId: "lodging",
  approvalPolicy: "user_tap",
  status: "success",
  payload: { slot: { start: "2026-07-16", end: "2026-07-17" }, guestCount: 2 },
});

const merged = buildContextHubTimelineRows([reserve], events);
assert.ok(merged.length >= 2);
assert.ok(merged.every((row) => row.kind === "hub" || row.kind === "engine"));
assert.ok(
  merged.some((row) => row.labelKo === "숙소 확보"),
  "hub reserve row present",
);
assert.ok(
  merged.some((row) => row.labelKo === "숙소 고정"),
  "engine main_selected row present",
);
assert.ok(
  merged.some((row) => row.labelKo === "숙소 찾기"),
  "engine scout_complete row present",
);

console.log("test-engine-event-timeline: ok");
