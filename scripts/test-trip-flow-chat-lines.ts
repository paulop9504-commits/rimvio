#!/usr/bin/env npx tsx
import assert from "node:assert/strict";

import { composeTravelTripBlueprint } from "@/lib/context-blueprint/examples/travel-trip-execution-graph";
import {
  buildTripIngressCreatedChatAssistantLine,
  composeTripFlowChatAssistantLine,
} from "@/lib/globe/trip-situation-router/build-trip-flow-chat-lines";
import { advanceRealitySurfaceDestination } from "@/lib/reality-surface/advance-ingress-flow";
import { composeRealitySurfaceFromBlueprint } from "@/lib/reality-surface/project-globe-ingress";

const blueprint = composeTravelTripBlueprint({
  contextId: "evt-test",
  goal: "다음 주 여행",
});
const created = buildTripIngressCreatedChatAssistantLine({
  eventTitle: "여행 여행",
  blueprint,
});
assert.match(created, /맥락을 지구에 붙였/);
assert.match(created, /다음 · 목적지/);

const session = composeRealitySurfaceFromBlueprint({
  eventId: "evt-test",
  goalKo: "다음 주 여행",
  bridgePathLabels: ["집", "공항", "Stay region", "호텔"],
  blueprint,
  runtimeId: "rt-test",
});
const afterDest = advanceRealitySurfaceDestination({
  session,
  destinationLabel: "오사카",
});
const destLine = composeTripFlowChatAssistantLine({
  headline: "오사카 · 목적지 잡았어요",
  blueprint: afterDest.operatorBlueprint,
  destinationLabel: "오사카",
  viewerLat: 37.5665,
  viewerLng: 126.978,
});
assert.match(destLine, /인천공항/);

console.log("test-trip-flow-chat-lines: ok");
