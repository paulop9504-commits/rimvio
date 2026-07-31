#!/usr/bin/env npx tsx
/**
 * Workspace camera follows Context destination — never silent Seoul.
 * Draft Entities resolve by id/title; lodging merge keeps USJ/Dotonbori.
 */

import assert from "node:assert/strict";
import { resolveDestinationAnchor } from "../lib/context-workspace/reality-draft/compile-trip-entity-slots";
import {
  resolveWorkspaceContextDestinationKo,
  resolveWorkspaceMapCenter,
  resolveWorkspaceMapCenterFromContext,
} from "../lib/context-workspace/stamp-trip-draft-onto-context";
import { resolveWorkspaceFocusNode } from "../lib/context-workspace/resolve-workspace-focus-node";
import { mergePreservePinnedNodes } from "../lib/context-workspace/merge-preserve-pinned";
import { prepareTripWorkspaceDraft } from "../lib/context-workspace/prepare-trip-workspace-draft";
import {
  clearContextWorkspace,
  clearWorkspaceChat,
} from "../lib/context-workspace";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";
import type { ContextWorkspaceNode } from "../lib/context-workspace/types";

const osaka = resolveWorkspaceMapCenter("오사카");
assert.ok(osaka.lat > 34 && osaka.lat < 35);
assert.ok(osaka.lng > 135 && osaka.lng < 136);

const seoul = resolveWorkspaceMapCenter("서울");
assert.ok(seoul.lat > 37 && seoul.lat < 38);

const unknown = resolveDestinationAnchor("숙소");
assert.ok(unknown.lat > 34 && unknown.lat < 35, "unknown → Osaka hub");

assert.equal(
  resolveWorkspaceContextDestinationKo({
    query: "호텔",
    eventTitle: "오사카 4박5일",
  }),
  "오사카",
);

const fromEvent = resolveWorkspaceMapCenterFromContext({
  query: "숙소 찾아줘",
  projectTitleKo: "오사카 여행",
  eventPlace: "오사카",
  eventTitle: "오사카 여행",
  metadata: { travelDestination: "오사카" },
});
assert.ok(fromEvent.lng > 135 && fromEvent.lng < 136);

const CTX = "test:workspace-map-center-focus";
const stamp = "2026-08-01T02:00:00.000Z";
resetEventCandidatesForTests([]);
clearWorkspaceChat(CTX);
clearContextWorkspace(CTX);
commitEventUpsert({
  id: CTX,
  title: "오사카 여행",
  category: "travel",
  source: "manual",
  lifecycle: "active",
  datetime: stamp,
  place: "오사카",
  confidence: 1,
  lifecycleUpdatedAt: stamp,
  createdAt: stamp,
  updatedAt: stamp,
  metadata: { travelDestination: "오사카" },
});

const draft = prepareTripWorkspaceDraft({
  utterance: "오사카 4박5일",
  contextEventId: CTX,
  expand: false,
});
assert.ok(draft);
const usj = draft!.nodes.find((n) => /유니버설/u.test(n.title));
const doton = draft!.nodes.find((n) => /도톤/u.test(n.title));
assert.ok(usj, "USJ pin");
assert.ok(doton, "Dotonbori pin");
assert.ok(usj!.lat > 34.6 && usj!.lat < 34.7);
assert.ok(usj!.lng > 135.4 && usj!.lng < 135.5);

const byPlace = resolveWorkspaceFocusNode(draft!.nodes, usj!.placeId);
assert.equal(byPlace?.id, usj!.id);
const byTitle = resolveWorkspaceFocusNode(draft!.nodes, "", "유니버설 스튜디오");
assert.equal(byTitle?.id, usj!.id);

const seoulHotel: ContextWorkspaceNode = {
  id: "ws-node:seoul-hotel",
  kind: "lodging",
  placeId: "maps:seoul-hotel",
  title: "서울 테스트호텔",
  summaryKo: "wrong geocode",
  lat: 37.5665,
  lng: 126.978,
  rating: 4,
  priceBand: 2,
  amountLabel: null,
  reviewCount: null,
  thumbnailUrl: null,
  tags: [],
  visible: true,
  selected: false,
  bookmarked: false,
  source: "maps",
};

const merged = mergePreservePinnedNodes(draft!.nodes, [seoulHotel], 36);
assert.ok(
  merged.some((n) => /유니버설/u.test(n.title)),
  "USJ survives lodging merge",
);
assert.ok(
  merged.some((n) => /도톤/u.test(n.title)),
  "Dotonbori survives lodging merge",
);
assert.ok(merged.some((n) => n.placeId === seoulHotel.placeId));

clearWorkspaceChat(CTX);
clearContextWorkspace(CTX);
console.log("ok: workspace map center + draft pin focus/merge");
