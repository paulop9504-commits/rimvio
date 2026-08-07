#!/usr/bin/env npx tsx
/**
 * 「상하이에서 꼭 가봐야할곳」→ activity/POI Workspace — never lodging hotels.
 * Camera center must follow Shanghai, not Osaka default.
 */

import assert from "node:assert/strict";
import {
  concurrentDiscoveryResourceTypes,
  isActivityOnlyDiscoveryUtterance,
} from "../lib/globe/context-condition-ai/concurrent-lodging-eatery-cues";
import { resolveDestinationAnchor } from "../lib/context-workspace/reality-draft/compile-trip-entity-slots";
import { resolveWorkspaceMapCenter } from "../lib/context-workspace/stamp-trip-draft-onto-context";
import { prepareWorkspaceResources } from "../lib/workspace-kind/prepare-workspace-resources";
import { classifyWorkspaceKind } from "../lib/workspace-kind/classify-workspace-kind";
import { compileWorkspaceAgentPlan } from "../lib/context-run/compile-workspace-agent-plan";
import { isWorkspaceAgentWorkUtterance } from "../lib/context-run/is-workspace-agent-work-utterance";

const memory = new Map<string, string>();
const storage = {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => {
    memory.set(k, v);
  },
  removeItem: (k: string) => {
    memory.delete(k);
  },
  clear: () => memory.clear(),
};
Object.assign(globalThis, {
  localStorage: storage,
  sessionStorage: storage,
  window: {
    localStorage: storage,
    sessionStorage: storage,
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
    setTimeout: (fn: () => void, _ms?: number) => {
      fn();
      return 0;
    },
    clearTimeout: () => {},
  },
});

const utterance = "상하이에서 꼭 가봐야할곳";
assert.equal(isActivityOnlyDiscoveryUtterance(utterance), true);
assert.deepEqual(concurrentDiscoveryResourceTypes(utterance), ["activity"]);
assert.equal(classifyWorkspaceKind(utterance), "travel");
assert.equal(isWorkspaceAgentWorkUtterance(utterance), true);
assert.equal(isWorkspaceAgentWorkUtterance("꼭 가봐야할곳 찾아줘"), true);

const shanghai = resolveWorkspaceMapCenter("상하이");
assert.ok(shanghai.lat > 31 && shanghai.lat < 32, `lat=${shanghai.lat}`);
assert.ok(shanghai.lng > 121 && shanghai.lng < 122, `lng=${shanghai.lng}`);
assert.notEqual(
  resolveDestinationAnchor("상하이").lat,
  resolveDestinationAnchor("오사카").lat,
);

const prepared = prepareWorkspaceResources({
  utterance,
  contextEventId: "ctx-shanghai-poi",
  titleOverrideKo: "상하이",
});
assert.ok(prepared?.workspace);
assert.equal(prepared!.workspace!.domain, "poi");
assert.equal(
  prepared!.workspace!.nodes.filter((n) => n.kind === "lodging").length,
  0,
);
assert.equal(prepared!.card.focusSlotId, "itinerary");

const plan = compileWorkspaceAgentPlan({
  utterance,
  contextEventId: "ctx-shanghai-poi",
});
const hotelSteps = plan.steps.filter(
  (s) => s.expect?.target === "lodging" || /호텔/.test(s.labelKo ?? ""),
);
const activitySteps = plan.steps.filter(
  (s) =>
    s.expect?.target === "poi" ||
    s.expect?.target === "activity" ||
    /놀거리|명소|관광/.test(s.labelKo ?? ""),
);
assert.equal(hotelSteps.length, 0, "must not scout lodging");
assert.ok(activitySteps.length >= 1, "must scout activity/poi");

console.log("test-shanghai-must-visit-not-lodging: ok");
