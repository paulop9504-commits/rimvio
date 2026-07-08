#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import {
  buildContextAgentMarkerActionHint,
  buildContextAgentMarkerChatLines,
  buildContextAgentMarkerInsight,
} from "../lib/globe/context-agent/context-agent-globe-marker-focus";
import { classifyInput } from "../lib/globe/context-condition-ai/dispatch/classify-input";
import { projectContextConditionEateryGlobeMarkers } from "../lib/globe/context-condition-ai/project-context-condition-globe-markers";
import { resolveSmallTalk } from "../lib/globe/context-condition-ai/resolve-small-talk";
import { filterHubMarkersByProjectionPolicy } from "../lib/globe/spatial-semantic/resolve-context-condition-marker-visibility";
import { isExplicitActivityLandmarkQuery } from "../lib/globe/context-condition-ai/resolve-activity-landmark-inventory";
import { activitySubtypeActionLabel } from "../lib/globe/place/activity-subtype-presentation";

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

  assert.equal(
    buildContextAgentMarkerInsight({
      title: "난바 시티",
      kind: "activity",
      activitySubtype: "shopping",
      anchorPlaceName: "오사카",
    }),
    "난바 시티 · 오사카 쇼핑 후보",
  );

  const shoppingChat = buildContextAgentMarkerChatLines({
    title: "난바 시티",
    kind: "activity",
    activitySubtype: "shopping",
    reasonKo: "쇼핑 의도와 맞는 장소예요",
    anchorPlaceName: "오사카",
  });
  assert.equal(shoppingChat.insightKo, "난바 시티 — 쇼핑 의도와 맞는 장소예요");
  assert.equal(
    shoppingChat.actionHintKo,
    "매장 동선이면 네비로 바로 갈 수 있어요",
  );
  assert.equal(
    buildContextAgentMarkerActionHint({
      kind: "activity",
      activitySubtype: "photo_spot",
    }),
    "사진 찍을 자리까지 길찾기로 바로 이동할 수 있어요",
  );
  assert.equal(activitySubtypeActionLabel("museum"), "관람 길찾기");

  const event: EventCandidate = {
    id: "evt",
    title: "오사카",
    category: "travel",
    datetime: "2026-07-12T00:00:00.000Z",
    place: "오사카",
    metadata: {
      contextEateryInventory: [
        {
          placeId: "mall-1",
          name: "난바 시티",
          lat: 34.664,
          lng: 135.501,
          images: [],
        },
      ],
      contextEateryHubEnabled: true,
      contextConditionPinBatches: [
        {
          batchId: "batch-1",
          lodgingPlaceIds: [],
          eateryPlaceIds: ["mall-1"],
          eateryKind: "activity",
          activitySubtype: "shopping",
          atIso: "2026-07-01T00:00:00.000Z",
        },
      ],
    },
  };
  const projected = projectContextConditionEateryGlobeMarkers({ event });
  assert.equal(projected.length, 1);
  assert.equal(projected[0]?.ontologyBadgeLabel, "쇼핑");

  console.log("test-globe-chat-weather-and-map-focus: ok");
}

void main();
