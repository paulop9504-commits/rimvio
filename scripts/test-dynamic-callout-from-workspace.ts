/**
 * Dynamic Callout from-workspace (live schema) smoke.
 * Run: npx tsx scripts/test-dynamic-callout-from-workspace.ts
 */
import assert from "node:assert/strict";
import {
  buildDynamicCalloutInputFromWorkspace,
  syncCalloutsFromWorkspace,
} from "@/lib/callout/dynamic";
import {
  clearContextWorkspace,
  openMapContextWorkspace,
  writeContextWorkspace,
  readContextWorkspace,
} from "@/lib/context-workspace";

const CTX = "ctx_dyn_callout_ws";
clearContextWorkspace(CTX);
openMapContextWorkspace({
  contextEventId: CTX,
  domain: "lodging",
  query: "난바 호텔",
  summaryKo: "Namba Trip",
  candidates: [
    {
      id: "lodging:test:a",
      labelKo: "Hotel Test",
      lat: 34.66,
      lng: 135.5,
      rating: 4.2,
      amountLabel: "120000원",
      source: "maps",
    },
  ],
});

const state = readContextWorkspace(CTX)!;
const withSelect = {
  ...state,
  selectedIds: [state.nodes[0]!.id],
};
writeContextWorkspace(withSelect);

const input = buildDynamicCalloutInputFromWorkspace({
  state: readContextWorkspace(CTX)!,
  entityId: state.nodes[0]!.id,
});
assert.ok(input);
assert.equal(input!.object.title, "Hotel Test");
assert.equal(input!.context.contextId, CTX);
assert.ok(!("workspace" in input!));
assert.ok(!("imageUrl" in input!.object));

const synced = syncCalloutsFromWorkspace({
  contextEventId: CTX,
  entityIds: [state.nodes[0]!.id],
  openWindows: false,
});
assert.ok(synced.schemas.length >= 1);
assert.equal(synced.calloutCount, synced.schemas.length);
assert.equal(synced.opened, 0);

clearContextWorkspace(CTX);
console.log("ok — dynamic callout from-workspace live schema");
