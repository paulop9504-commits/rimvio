/**
 * DiscoveryExecution active-surface SSOT — Cursor-like one prompt = one run.
 * @see lib/globe/discovery-execution/
 */

import assert from "node:assert/strict";
import {
  clearActiveDiscoveryExecution,
  listDiscoveryExecutionSnapshots,
  readActiveDiscoveryExecution,
  writeActiveDiscoveryExecution,
} from "@/lib/globe/discovery-execution";

const contextEventId = "evt-discovery-exec-ssot";

clearActiveDiscoveryExecution(contextEventId);

const hotel = {
  batchId: "batch-hotel-1",
  count: 2,
  summaryKo: "호텔 2곳",
  atIso: "2026-07-11T00:00:00.000Z",
  triggerMessage: "주변 호텔",
  recommendations: [
    {
      kind: "lodging" as const,
      title: "Hotel A",
      reasonKo: "가까움",
      placeId: "h1",
      lat: 34.7,
      lng: 135.5,
    },
  ],
};

const pharmacy = {
  batchId: "batch-pharmacy-1",
  count: 1,
  summaryKo: "약국 1곳",
  atIso: "2026-07-11T01:00:00.000Z",
  triggerMessage: "약국 찾기",
  recommendations: [
    {
      kind: "amenity" as const,
      title: "Sugi",
      reasonKo: "9분",
      placeId: "p1",
      lat: 34.71,
      lng: 135.51,
    },
  ],
};

writeActiveDiscoveryExecution(contextEventId, hotel, { archivePrior: false });
assert.equal(readActiveDiscoveryExecution(contextEventId)?.batchId, "batch-hotel-1");

writeActiveDiscoveryExecution(contextEventId, pharmacy, { archivePrior: true });
assert.equal(readActiveDiscoveryExecution(contextEventId)?.batchId, "batch-pharmacy-1");
assert.equal(
  readActiveDiscoveryExecution(contextEventId)?.recommendations?.[0]?.kind,
  "amenity",
);

const archived = listDiscoveryExecutionSnapshots(contextEventId);
assert.ok(archived.some((row) => row.batchId === "batch-hotel-1"));

clearActiveDiscoveryExecution(contextEventId);
assert.equal(readActiveDiscoveryExecution(contextEventId), null);

console.log("test-discovery-execution-ssot ok");
