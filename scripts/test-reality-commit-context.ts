/**
 * ADR-037 — Reality Commit densifies Context Graph.
 * Run: npx tsx scripts/test-reality-commit-context.ts
 */

import assert from "node:assert/strict";
import {
  buildTripStayTimeline,
  expandTripPeriodFromSegments,
  observationIsNotDecision,
  residueLayerForEventKind,
  resolveRealityResidueLayer,
  SELECTION_CANDIDATE_CONFIDENCE,
  type TripStaySegment,
} from "@/lib/workstream";

assert.equal(
  resolveRealityResidueLayer({ utterance: "숙소 찾아줘" }),
  "observation",
);
assert.equal(observationIsNotDecision("observation"), true);
assert.equal(
  resolveRealityResidueLayer({ selected: true }),
  "selection",
);
assert.equal(
  resolveRealityResidueLayer({ realityCommitted: true }),
  "commit",
);
assert.equal(residueLayerForEventKind("HotelSelected"), "selection");
assert.equal(residueLayerForEventKind("HotelCommitted"), "commit");
assert.equal(SELECTION_CANDIDATE_CONFIDENCE, 0.6);

const segments: TripStaySegment[] = [
  {
    id: "op:a",
    hotelLabel: "Hotel A",
    placeId: "a",
    locationLabel: "Osaka Namba",
    checkInYmd: "2026-07-31",
    checkOutYmd: "2026-08-01",
    status: "confirmed",
    committedAtIso: "2026-07-01T00:00:00.000Z",
  },
  {
    id: "op:b",
    hotelLabel: "Hotel B",
    placeId: "b",
    locationLabel: "Osaka Umeda",
    checkInYmd: "2026-08-01",
    checkOutYmd: "2026-08-04",
    status: "confirmed",
    committedAtIso: "2026-07-01T01:00:00.000Z",
  },
];

const period = expandTripPeriodFromSegments(segments);
assert.ok(period);
assert.equal(period!.checkInYmd, "2026-07-31");
assert.equal(period!.checkOutYmd, "2026-08-04");
assert.equal(period!.nights, 4);
assert.equal(period!.days, 5);

const timeline = buildTripStayTimeline(segments);
assert.ok(timeline.length >= 4);
assert.equal(timeline[0]?.kind, "arrive");
assert.equal(timeline[0]?.hotelLabel, "Hotel A");
const move = timeline.find((d) => d.kind === "move");
assert.ok(move);
assert.equal(move!.fromHotelLabel, "Hotel A");
assert.equal(move!.toHotelLabel, "Hotel B");
assert.equal(timeline[timeline.length - 1]?.kind, "depart");

console.log("OK — reality-commit-context");
