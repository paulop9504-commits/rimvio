/**
 * Confirmed Reality → never re-ask “며칠이에요?”
 * Run: npx tsx scripts/test-confirmed-reality-ask-gate.ts
 */

import assert from "node:assert/strict";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { nextTravelSlot } from "@/lib/experience-run/travel-context-slots";
import {
  filterTripIntakeGapsByConfirmedReality,
  resolveConfirmedRealityAskGate,
  TRIP_STAY_SEGMENTS_META_KEY,
} from "@/lib/workstream";

const osakaEvent = {
  id: "ctx-osaka",
  title: "오사카 여행",
  place: "오사카",
  metadata: {
    globePlaceLabel: "오사카",
    travelDestination: "오사카",
    contextLodgingGuestCount: 2,
    [TRIP_STAY_SEGMENTS_META_KEY]: {
      version: 1,
      segments: [
        {
          id: "op:a",
          hotelLabel: "Hotel A",
          placeId: "a",
          locationLabel: "Namba",
          checkInYmd: "2026-07-31",
          checkOutYmd: "2026-08-01",
          status: "confirmed",
          committedAtIso: "2026-07-01T00:00:00.000Z",
        },
        {
          id: "op:b",
          hotelLabel: "Hotel B",
          placeId: "b",
          locationLabel: "Umeda",
          checkInYmd: "2026-08-01",
          checkOutYmd: "2026-08-04",
          status: "confirmed",
          committedAtIso: "2026-07-01T01:00:00.000Z",
        },
      ],
    },
  },
} as unknown as EventCandidate;

{
  const gate = resolveConfirmedRealityAskGate({ event: osakaEvent });
  assert.equal(gate.knownFacts.destinationLabel, "오사카");
  assert.equal(gate.knownFacts.checkInYmd, "2026-07-31");
  assert.equal(gate.knownFacts.checkOutYmd, "2026-08-04");
  assert.equal(gate.knownFacts.nights, 4);
  assert.ok(gate.askForbiddenSlots.includes("dates"));
  assert.ok(gate.askForbiddenSlots.includes("duration"));
  assert.ok(gate.askForbiddenSlots.includes("destination"));
  assert.ok(gate.askForbiddenSlots.includes("lodging"));
  assert.equal(
    filterTripIntakeGapsByConfirmedReality(
      ["dates", "guests", "budget", "destination"],
      gate,
    ).includes("dates"),
    false,
  );
  assert.ok(
    gate.actionProposalsKo.some((line) => /항공|맛집|동선|일정/.test(line)),
  );
  assert.ok(!gate.actionProposalsKo.some((line) => /입력해\s*주세요/.test(line)));
}

{
  const next = nextTravelSlot(
    { destination: null, durationDays: null, anchorTimeIso: null },
    { event: osakaEvent },
  );
  assert.notEqual(next, "duration", "must not ask 며칠이에요 when stay confirmed");
  assert.notEqual(next, "destination");
}

console.log("OK — confirmed-reality-ask-gate");
