#!/usr/bin/env npx tsx
import assert from "node:assert/strict";

import { composeTravelTripBlueprint } from "@/lib/context-blueprint/examples/travel-trip-execution-graph";
import { inferDepartureHubHypothesis } from "@/lib/globe/infer-departure-hub-hypothesis";
import { resolveTripSituationRouter } from "@/lib/globe/trip-situation-router";
import {
  advanceRealitySurfaceDepartureHub,
  advanceRealitySurfaceDestination,
} from "@/lib/reality-surface/advance-ingress-flow";
import { getDepartureHubAirport } from "@/lib/globe/departure-hub-airports";
import { composeRealitySurfaceFromBlueprint } from "@/lib/reality-surface/project-globe-ingress";

const idle = resolveTripSituationRouter({
  layerMode: "personal",
  session: null,
});
assert.ok(idle);
assert.equal(idle!.stage, "idle");

const blueprint = composeTravelTripBlueprint({
  contextId: "evt-test",
  bridgeId: "evt-test",
  runtimeId: "rt-test",
  goal: "다음 주 여행",
});
const session = composeRealitySurfaceFromBlueprint({
  eventId: "evt-test",
  goalKo: "다음 주 여행",
  bridgePathLabels: ["집", "공항", "Stay region", "호텔"],
  blueprint,
  runtimeId: "rt-test",
});
const needsDest = resolveTripSituationRouter({
  layerMode: "personal",
  session,
});
assert.equal(needsDest!.stage, "needs_destination");

const afterDest = advanceRealitySurfaceDestination({
  session,
  destinationLabel: "오사카",
});
const seoulConfirm = resolveTripSituationRouter({
  layerMode: "personal",
  session: afterDest,
  viewerLat: 37.5665,
  viewerLng: 126.978,
});
assert.equal(seoulConfirm!.stage, "needs_departure_confirm");
assert.match(seoulConfirm!.reasonKo, /인천공항/);

const busanHypothesis = inferDepartureHubHypothesis({
  destinationLabel: "오사카",
  viewerLat: 35.1796,
  viewerLng: 129.0756,
});
assert.equal(busanHypothesis.hub.id, "pus");
assert.equal(busanHypothesis.confidence, "high");

const chungcheongOverseas = inferDepartureHubHypothesis({
  destinationLabel: "후쿠오카",
  viewerLat: 36.635,
  viewerLng: 127.489,
});
assert.equal(chungcheongOverseas.hub.id, "icn");
assert.equal(chungcheongOverseas.hub.shortLabelKo, "인천공항");

const busanConfirm = resolveTripSituationRouter({
  layerMode: "personal",
  session: afterDest,
  viewerLat: 35.1796,
  viewerLng: 129.0756,
});
assert.match(busanConfirm!.reasonKo, /김해공항/);

const afterDeparture = advanceRealitySurfaceDepartureHub({
  session: afterDest,
  hub: getDepartureHubAirport("icn"),
  homeLabel: "서울",
});
const ready = resolveTripSituationRouter({
  layerMode: "personal",
  session: afterDeparture,
});
assert.equal(ready!.stage, "ready_for_domain");
assert.equal(ready!.choices[0]?.action, "lodging");

console.log("test-trip-situation-router: ok");
