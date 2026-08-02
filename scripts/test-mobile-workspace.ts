/**
 * Smoke: Mobile Workspace state machine —
 * Map + Command + Progressive Disclosure (compact → expanded → full).
 * No multi Floating Windows.
 */
import assert from "node:assert/strict";
import {
  MOBILE_CALLOUT_MODES,
  buildNearbyRelationsFromAnchor,
  clearMobileWorkspaceForTests,
  dispatchMobileWorkspace,
  parseMobileWorkspaceCommand,
  readMobileWorkspace,
  type MobileWorkspaceEntity,
} from "@/lib/mobile-workspace";

clearMobileWorkspaceForTests();

assert.deepEqual([...MOBILE_CALLOUT_MODES], ["compact", "expanded", "full"]);

const hotel: MobileWorkspaceEntity = {
  id: "hotel_namba",
  kind: "hotel",
  title: "Namba Hotel",
  lat: 34.665,
  lng: 135.501,
  score: 92,
  subtitleKo: "난바 4분",
  priceLabelKo: "₩120,000",
};
const food: MobileWorkspaceEntity = {
  id: "food_1",
  kind: "restaurant",
  title: "Sushi Bar",
  lat: 34.666,
  lng: 135.502,
  score: 88,
  subtitleKo: null,
  priceLabelKo: null,
};
const place: MobileWorkspaceEntity = {
  id: "place_1",
  kind: "attraction",
  title: "Dotonbori",
  lat: 34.668,
  lng: 135.5015,
  score: 95,
  subtitleKo: null,
  priceLabelKo: null,
};

const entities = [hotel, food, place];
const relations = buildNearbyRelationsFromAnchor({
  anchorId: hotel.id,
  entities,
});
assert.ok(relations.length >= 1);
assert.ok(relations.every((r) => r.fromId === hotel.id));

dispatchMobileWorkspace({
  type: "hydrate",
  contextId: "ctx_osaka",
  contextTitleKo: "오사카 여행",
  entities,
  relations,
  anchorEntityId: hotel.id,
});

let s = readMobileWorkspace()!;
assert.equal(s.contextId, "ctx_osaka");
assert.equal(s.anchorEntityId, hotel.id);
assert.equal(s.entities.length, 3);
assert.equal(s.activeEntityId, null);
assert.equal(s.calloutMode, "compact");

dispatchMobileWorkspace({ type: "set_active", entityId: food.id });
s = readMobileWorkspace()!;
assert.equal(s.activeEntityId, food.id);
assert.equal(s.calloutMode, "compact");

dispatchMobileWorkspace({ type: "expand_callout" });
assert.equal(readMobileWorkspace()!.calloutMode, "expanded");

dispatchMobileWorkspace({ type: "expand_callout" });
assert.equal(readMobileWorkspace()!.calloutMode, "full");

dispatchMobileWorkspace({ type: "collapse_callout" });
assert.equal(readMobileWorkspace()!.calloutMode, "expanded");

dispatchMobileWorkspace({ type: "collapse_callout" });
assert.equal(readMobileWorkspace()!.calloutMode, "compact");

dispatchMobileWorkspace({ type: "collapse_callout" });
s = readMobileWorkspace()!;
assert.equal(s.activeEntityId, null);

dispatchMobileWorkspace({ type: "set_active", entityId: hotel.id });
dispatchMobileWorkspace({ type: "set_anchor", entityId: hotel.id });
assert.equal(readMobileWorkspace()!.anchorEntityId, hotel.id);

dispatchMobileWorkspace({
  type: "open_action_menu",
  entityId: food.id,
});
s = readMobileWorkspace()!;
assert.equal(s.actionMenuEntityId, food.id);
assert.equal(s.activeEntityId, food.id);

dispatchMobileWorkspace({ type: "close_action_menu" });
assert.equal(readMobileWorkspace()!.actionMenuEntityId, null);

const foodCmd = parseMobileWorkspaceCommand("호텔 근처 맛집 찾아줘");
assert.equal(foodCmd.action, "discover");
assert.equal(foodCmd.target, "restaurant");

const anchorCmd = parseMobileWorkspaceCommand("이 호텔 기준으로 찾아줘");
assert.equal(anchorCmd.action, "set_anchor");

const cheapCmd = parseMobileWorkspaceCommand("더 싼 곳으로 변경");
assert.equal(cheapCmd.action, "replace");

dispatchMobileWorkspace({
  type: "apply_intent",
  intent: {
    rawText: "호텔 근처 맛집 찾아줘",
    action: foodCmd.action,
    target: foodCmd.target,
    constraint: foodCmd.constraint,
  },
  entities,
  relations,
});
assert.equal(
  readMobileWorkspace()!.currentIntent?.rawText,
  "호텔 근처 맛집 찾아줘",
);

dispatchMobileWorkspace({ type: "close_callout" });
assert.equal(readMobileWorkspace()!.activeEntityId, null);

dispatchMobileWorkspace({ type: "clear" });
assert.equal(readMobileWorkspace(), null);

console.log("ok — mobile workspace state machine");
