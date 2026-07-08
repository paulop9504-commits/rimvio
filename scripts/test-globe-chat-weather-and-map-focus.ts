#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { classifyInput } from "../lib/globe/context-condition-ai/dispatch/classify-input";
import { resolveSmallTalk } from "../lib/globe/context-condition-ai/resolve-small-talk";
import { filterHubMarkersByProjectionPolicy } from "../lib/globe/spatial-semantic/resolve-context-condition-marker-visibility";
import { isExplicitActivityLandmarkQuery } from "../lib/globe/context-condition-ai/resolve-activity-landmark-inventory";

async function main() {
  assert.equal(resolveSmallTalk({ text: "현재 기온", region: "도쿄" })?.topic, "weather");

  const classified = await classifyInput({ text: "현재 기온", region: "도쿄" });
  assert.equal(classified.category, "chat");
  assert.equal(classified.source, "deterministic");

  const markers = [
    { resourceId: "evt:lodging:hotel-a", label: "Hotel A" },
    { resourceId: "evt:lodging:hotel-b", label: "Hotel B" },
    { resourceId: "evt:eatery:cafe-a", label: "Cafe A" },
  ];

  const focused = filterHubMarkersByProjectionPolicy({
    markers,
    contextEventId: "evt",
    policy: {
      mode: "focus",
      activeContextEventId: "evt",
      visiblePlaceIds: ["hotel-a"],
    },
  });
  assert.equal(focused.length, 1);
  assert.equal(focused[0]?.resourceId, "evt:lodging:hotel-a");

  const contextOnly = filterHubMarkersByProjectionPolicy({
    markers,
    contextEventId: "evt",
    policy: {
      mode: "context_only",
      activeContextEventId: "evt",
      visiblePlaceIds: [],
    },
  });
  assert.equal(contextOnly.length, 0);

  assert.equal(isExplicitActivityLandmarkQuery("도쿄 디즈니랜드"), true);

  console.log("test-globe-chat-weather-and-map-focus: ok");
}

void main();
