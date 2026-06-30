#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  dispatchExecutionFeedClear,
  dispatchExecutionFeedGoal,
  dispatchExecutionFeedStep,
  dispatchExecutionFeedTogglePill,
  readExecutionFeedState,
} from "../lib/context-run/execution-feed-bridge";
import { reduceExecutionFeedGoal } from "../lib/context-run/execution-feed-reducer";

const root = join(import.meta.dirname, "..");

dispatchExecutionFeedClear();

const reduced = reduceExecutionFeedGoal(
  { run: null },
  { graphId: "composer:abc", goalKo: "둔산동 숙소" },
);
assert.equal(reduced.run?.goalKo, "둔산동 숙소");
assert.equal(reduced.run?.pills.length, 0);

dispatchExecutionFeedGoal({ graphId: "composer:abc", goalKo: "둔산동 숙소" });
dispatchExecutionFeedStep({
  graphId: "composer:abc",
  stepId: "intent_connect",
  labelKo: "숙소 탐색",
  status: "running",
});
let state = readExecutionFeedState();
assert.equal(state.run?.pills.length, 1);
assert.equal(state.run?.activePillId, "intent_connect");

dispatchExecutionFeedStep({
  graphId: "composer:abc",
  stepId: "intent_connect",
  labelKo: "숙소 탐색",
  status: "done",
  resultKo: "✓ 3개 자원",
});
state = readExecutionFeedState();
assert.equal(state.run?.pills[0]?.status, "done");
assert.equal(state.run?.activePillId, null);

dispatchExecutionFeedTogglePill("intent_connect");
state = readExecutionFeedState();
assert.equal(state.run?.expandedPillId, "intent_connect");

const dock = readFileSync(join(root, "components/globe/globe-capture-dock.tsx"), "utf8");
assert.ok(!dock.includes("GlobeExecutionFeed"), "composer chat lives in CaptureSheet");
assert.ok(!dock.includes("GlobeMapIntentPromptRail"), "legacy rail replaced");

const ingest = readFileSync(
  join(root, "components/globe/globe-context-ingest-bar.tsx"),
  "utf8",
);
assert.ok(
  ingest.includes("dispatchContextRun"),
  "composer must route through dispatchContextRun",
);
const dispatchRun = readFileSync(
  join(root, "lib/context-run/dispatch-context-run.ts"),
  "utf8",
);
assert.ok(
  dispatchRun.includes("dispatchExecutionFeedGoal"),
  "dispatchContextRun must push goal to feed for personal layer",
);

dispatchExecutionFeedClear();

console.log("test-globe-execution-feed: ok");
