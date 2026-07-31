import assert from "node:assert/strict";
import {
  detectAccommodationIntent,
  eventHasAccommodationServiceType,
  stampAccommodationServiceTypeOnEvent,
} from "@/lib/event-kernel";
import { EVENT_SERVICE_TYPE_META_KEY } from "@/lib/events/event-metadata-keys";
import { upsertEventCandidate, replaceEventCandidatesForTests, findEventCandidate } from "@/lib/events/event-store";
import { syncAccommodationSearchPins } from "@/lib/globe/accommodation/create-accommodation-search-pins";
import { DAEJEON_LODGING_MOCK } from "@/lib/globe/context-hub/lodging-mock-inventory";
import { runStagedPinReveal } from "@/lib/globe/opportunity-field/staged-pin-reveal";
import { resetPersonalGlobePinsForTests } from "@/lib/globe/personal-globe-pin-store";

function seedTripEvent() {
  const stamp = "2026-06-20T08:00:00.000Z";
  return upsertEventCandidate({
    id: "test-accommodation-hub",
    title: "대전 출장",
    category: "travel",
    source: "manual",
    lifecycle: "planned",
    datetime: "2026-08-22T09:00:00.000Z",
    place: "대전",
    description: "호텔 어디서 자지",
    metadata: { feedPlanEnabled: true },
    confidence: 0.9,
    lifecycleUpdatedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
  });
}

function run() {
  replaceEventCandidatesForTests([]);
  resetPersonalGlobePinsForTests();

  assert.equal(detectAccommodationIntent("숙소 추천해줘")?.serviceType, "accommodation");
  assert.equal(detectAccommodationIntent("호텔 예약")?.serviceType, "accommodation");
  assert.equal(detectAccommodationIntent("어디서 자면 좋을까")?.serviceType, "accommodation");
  assert.equal(detectAccommodationIntent("맛집 추천"), null);

  const event = seedTripEvent();
  assert.equal(eventHasAccommodationServiceType(event), false);
  assert.ok(findEventCandidate(event.id), "seeded event must be readable");

  const stamped = stampAccommodationServiceTypeOnEvent(event.id);
  assert.ok(stamped);
  assert.equal(stamped?.metadata?.[EVENT_SERVICE_TYPE_META_KEY], "accommodation");
  assert.equal(eventHasAccommodationServiceType(stamped), true);

  resetPersonalGlobePinsForTests();
  const pins = syncAccommodationSearchPins({
    contextEvent: stamped!,
    rows: DAEJEON_LODGING_MOCK.slice(0, 3),
  });
  // Reality OS: lodging search does not paint 3D Globe pins before Commit.
  assert.equal(pins.length, 0);

  let revealed = 0;
  if (typeof window !== "undefined") {
    const stop = runStagedPinReveal({
      items: [{ id: "a" }, { id: "b" }],
      intervalMs: 10,
      onReveal: () => {
        revealed += 1;
      },
    });
    stop();
    assert.equal(revealed, 1);
  }

  console.log("test-accommodation-hub-pipeline: ok");
}

run();
