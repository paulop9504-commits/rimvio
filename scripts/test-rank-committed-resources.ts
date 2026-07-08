import assert from "node:assert/strict";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import {
  CONTEXT_LODGING_HUB_ENABLED_META_KEY,
  CONTEXT_LODGING_INVENTORY_META_KEY,
} from "../lib/globe/context-hub/lodging-resource-types";
import { listContextHubServicesForEvent } from "../lib/globe/context-hub/context-hub-service-catalog";
import { pinLodgingSelectionToContext } from "../lib/globe/context-hub/pin-lodging-selection-to-context";
import {
  COMMITTED_RESOURCE_RANK_BOOST,
  readCommittedContextResources,
} from "../lib/globe/resource";
import { rankContextResources } from "../lib/globe/resource/rank-context-resources";
import { clearHubActionLog, readHubActionLog } from "../lib/globe/resource/hub-action-record-store";
import { connectDepartureHubToContext } from "../lib/globe/connect-departure-hub-to-context";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";

resetEventCandidatesForTests([]);
const stamp = new Date().toISOString();

const event = commitEventUpsert({
  id: "test-rank-committed",
  title: "후쿠오카 출장",
  category: "travel",
  source: "manual",
  lifecycle: "active",
  datetime: stamp,
  place: "후쿠오카",
  confidence: 0.9,
  metadata: {
    [CONTEXT_LODGING_HUB_ENABLED_META_KEY]: true,
    globePlaceLat: 33.59,
    globePlaceLng: 130.4,
    [CONTEXT_LODGING_INVENTORY_META_KEY]: [
      {
        placeId: "stay-a",
        name: "재고만 호텔",
        lat: 33.59,
        lng: 130.4,
        images: [],
        priceKrw: 90000,
      },
      {
        placeId: "stay-b",
        name: "확정 호텔",
        lat: 33.591,
        lng: 130.401,
        images: [],
        priceKrw: 150000,
      },
    ],
  },
  lifecycleUpdatedAt: stamp,
  createdAt: stamp,
  updatedAt: stamp,
});

const rowB = (
  event.metadata?.[CONTEXT_LODGING_INVENTORY_META_KEY] as Array<{
    placeId: string;
    name: string;
    lat: number;
    lng: number;
    images: string[];
    priceKrw: number;
  }>
).find((row) => row.placeId === "stay-b")!;

const pinned = pinLodgingSelectionToContext({ eventId: event.id, row: rowB });
assert.equal(readCommittedContextResources(pinned).length, 1);

const panel = listContextHubServicesForEvent(pinned);
assert.ok(panel);
const ranked = rankContextResources({
  event: pinned,
  services: panel!.services,
  lat: 33.59,
  lng: 130.4,
});

const top = ranked[0];
assert.ok(top);
assert.equal(top!.resource.resourceId, `${event.id}:lodging:stay-b`);
assert.ok(
  top!.rankScore >= COMMITTED_RESOURCE_RANK_BOOST,
  `expected boost, got ${top!.rankScore}`,
);
assert.equal(top!.resource.metadata?.committed, true);

clearHubActionLog(event.id);
const connected = connectDepartureHubToContext({
  destinationEventId: event.id,
  airportId: "icn",
});
const flightResources = readCommittedContextResources(
  connected.destinationEvent,
).filter((row) => row.kind === "flight");
assert.equal(flightResources.length, 1);
assert.match(flightResources[0]!.resourceId, /:flight:/);

const actions = readHubActionLog(event.id);
assert.ok(actions.some((row) => row.type === "reserve" && row.sourceHubId === "hub.flight"));

console.log("test-rank-committed-resources: ok");
