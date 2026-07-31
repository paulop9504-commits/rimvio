/**
 * Reality OS — Globe Context Anchor tap → Workspace Resume.
 */
import assert from "node:assert/strict";
import {
  clearContextWorkspace,
  clearWorkspaceChat,
  prepareTripWorkspaceDraft,
  readContextAnchorProgressPercent,
  tryOpenContextAnchorWorkspace,
} from "../lib/context-workspace";
import { enrichGlobePinRecallBadges } from "../lib/globe/enrich-globe-pin-recall-badge";
import type { ClassifiedGlobePin } from "../lib/feed/experience-globe-ping-types";

const CTX = "test:context-anchor-workspace";

clearWorkspaceChat(CTX);
clearContextWorkspace(CTX);

assert.equal(
  tryOpenContextAnchorWorkspace({ contextEventId: CTX }).ok,
  false,
  "no draft → no Workspace open",
);

const state = prepareTripWorkspaceDraft({
  utterance: "오사카 여행",
  contextEventId: CTX,
  tripPrep: {
    destinationKo: "오사카",
    nights: 2,
    days: 3,
    checkInIso: null,
    checkOutIso: null,
  },
  expand: false,
});
assert.ok(state);
assert.ok(state!.nodes.some((n) => n.visible));

const opened = tryOpenContextAnchorWorkspace({
  contextEventId: CTX,
  utterance: "오사카 여행",
});
assert.equal(opened.ok, true, "Anchor tap opens Workspace when Entities exist");
if (opened.ok) {
  assert.equal(opened.state.contextEventId, CTX);
  assert.ok(opened.progressPercent >= 0);
}

const progress = readContextAnchorProgressPercent(CTX);
assert.ok(progress != null && progress >= 0);

const pin: ClassifiedGlobePin = {
  id: `pgpin:${CTX}`,
  kind: "place",
  lat: 34.67,
  lng: 135.5,
  pinX: 0.5,
  pinY: 0.5,
  label: "오사카 여행",
  emphasis: "primary",
  sourceEventId: CTX,
  pinShape: "dot",
};
const enriched = enrichGlobePinRecallBadges([pin], new Map());
const badge = enriched[0]?.recallBadgeLabel;
assert.ok(
  badge != null && /^\d+%$/.test(badge),
  `Anchor chrome shows progress badge, got ${badge}`,
);

clearWorkspaceChat(CTX);
clearContextWorkspace(CTX);
console.log("ok: context anchor → workspace resume");
