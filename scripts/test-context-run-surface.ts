#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildComposerGraphId,
  decideComposerExecution,
  resolveExecutionSurface,
  resolveGlobeComposerSurface,
} from "../lib/context-run";

const root = join(import.meta.dirname, "..");

assert.equal(decideComposerExecution("text_committed"), "auto");
assert.equal(decideComposerExecution("market_compose"), "recommend");

const plain = resolveGlobeComposerSurface({
  phase: "text_committed",
  eventId: "evt-1",
  composeText: "오늘 회의 메모",
});
assert.equal(plain.surface, "map_focus");
assert.equal(plain.effect.type, "map_focus");
assert.equal(plain.effect.type === "map_focus" ? plain.effect.eventId : null, "evt-1");
assert.doesNotMatch(plain.surface, /portal/u);

const market = resolveGlobeComposerSurface({
  phase: "market_compose",
  composeText: "@중고 아이폰 70만원",
});
assert.equal(market.surface, "portal");
assert.equal(market.effect.type, "open_portal");
assert.equal(market.decision, "recommend");

const discovery = resolveGlobeComposerSurface({
  phase: "discovery_market_hint",
});
assert.equal(discovery.surface, "field_discovery_ingress");
assert.equal(discovery.effect.type, "field_discovery");

const graphA = buildComposerGraphId("evt-1", "seed");
const graphB = buildComposerGraphId("evt-1", "seed");
assert.equal(graphA, graphB);
assert.match(graphA, /^composer:[a-f0-9]{8}$/u);

const matchDone = resolveExecutionSurface({
  graphId: "run:test",
  node: { id: "match_done", eventId: "evt-2" },
});
assert.equal(matchDone.surface, "field_discovery_ingress");
assert.equal(matchDone.decision, "recommend");

const publish = resolveExecutionSurface({
  graphId: "run:test",
  node: { id: "approval_publish" },
});
assert.equal(publish.surface, "approval_dialog");
assert.equal(publish.decision, "approval_required");

const homeClient = readFileSync(
  join(root, "components/globe/globe-home-client.tsx"),
  "utf8",
);
assert.ok(
  !homeClient.includes("onTextCommitted:"),
  "plain text commit must not auto-open Portal (G1/G8)",
);

const ingestBar = readFileSync(
  join(root, "components/globe/globe-context-ingest-bar.tsx"),
  "utf8",
);
assert.ok(
  ingestBar.includes("dispatchContextRun"),
  "composer submit must use dispatchContextRun single ingress",
);
assert.ok(
  !ingestBar.includes("runGlobeMapIntentSupply"),
  "composer must not call map supply directly",
);
assert.ok(
  !ingestBar.includes("resolveGlobeComposerSurface"),
  "composer Portal opens must pass dispatchContextRun → SurfaceResolver",
);
assert.ok(
  !ingestBar.includes("onTextCommitted"),
  "ingest bar must not expose text→Portal bypass hook",
);

console.log("test-context-run-surface: ok");
