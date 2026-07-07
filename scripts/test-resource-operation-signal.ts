import assert from "node:assert/strict";
import {
  applyLodgingOperationSignal,
  mergeResourceOperationStage,
  resolveResourceOperationResume,
  resolveResourceOperationSignal,
  upsertResourceOperation,
} from "../lib/resource-operation";
import type { GlobeLodgingMapMarker } from "../lib/globe/context-hub/lodging-globe-marker-types";

const marker: GlobeLodgingMapMarker = {
  markerKind: "lodging",
  id: "lodging:test",
  resourceId: "evt-1:lodging:hotel-a",
  label: "테스트 호텔",
  lat: 34.7,
  lng: 135.5,
  carouselIndex: 0,
  isMain: false,
  thumbnailUrl: "https://example.com/a.jpg",
};

upsertResourceOperation({
  contextEventId: "evt-1",
  resourceId: marker.resourceId,
  domain: "lodging",
  label: marker.label,
  stage: "searching",
});

const searchingSignal = resolveResourceOperationSignal(
  upsertResourceOperation({
    contextEventId: "evt-1",
    resourceId: marker.resourceId,
    domain: "lodging",
    label: marker.label,
    stage: "searching",
  }),
);
assert.equal(searchingSignal?.label, "검색 중…");
assert.equal(searchingSignal?.tone, "amber");
assert.equal(searchingSignal?.pulse, true);

upsertResourceOperation({
  contextEventId: "evt-1",
  resourceId: marker.resourceId,
  domain: "lodging",
  label: marker.label,
  stage: "booking",
});

const bookingSignal = resolveResourceOperationSignal(
  upsertResourceOperation({
    contextEventId: "evt-1",
    resourceId: marker.resourceId,
    domain: "lodging",
    label: marker.label,
    stage: "booking",
  }),
);
assert.equal(bookingSignal?.label, "예약 중");

const decorated = applyLodgingOperationSignal(marker);
assert.equal(decorated.operationSignalLabel, "예약 중");
assert.equal(decorated.operationSignalTone, "blue");

const resume = resolveResourceOperationResume(marker.resourceId);
assert.equal(resume?.intent, "book");
assert.equal(resume?.contextEventId, "evt-1");

assert.equal(mergeResourceOperationStage("booking", "searching"), "booking");

console.log("test-resource-operation-signal: ok");
