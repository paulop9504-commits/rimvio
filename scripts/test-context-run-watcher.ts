#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  dispatchExecutionFeedArtifact,
  dispatchExecutionFeedArtifactTab,
  dispatchExecutionFeedClear,
  dispatchExecutionFeedGoal,
  readExecutionFeedState,
} from "../lib/context-run/execution-feed-bridge";
import { ensureRunState, readActiveRunState } from "../lib/context-run/run-state-store";
import { marketComposeRunNode, reconstructExecutionFeedFromRunState } from "../lib/context-run/watcher-reconstruct";
import { reduceExecutionFeedArtifactTab } from "../lib/context-run/execution-feed-reducer";

const root = join(import.meta.dirname, "..");

dispatchExecutionFeedClear();

const tabbed = reduceExecutionFeedArtifactTab(
  {
    run: {
      id: "run:1",
      graphId: "composer:tab",
      createdAt: new Date().toISOString(),
      goalKo: "test",
      pills: [],
      activePillId: null,
      expandedPillId: null,
      artifact: {
        kind: "checklist",
        tabs: [
          { id: "checklist", labelKo: "체크" },
          { id: "prep", labelKo: "준비" },
        ],
        activeTabId: "checklist",
      },
    },
  },
  "prep",
);
assert.equal(tabbed.run?.artifact?.activeTabId, "prep");

dispatchExecutionFeedGoal({ graphId: "composer:market", goalKo: "아이폰 팔고 싶어" });
ensureRunState({
  graphId: "composer:market",
  goal: "아이폰 팔고 싶어",
  lastNode: marketComposeRunNode("place"),
});
dispatchExecutionFeedClear();

const rebuilt = reconstructExecutionFeedFromRunState();
assert.equal(rebuilt, true);
const state = readExecutionFeedState();
assert.equal(state.run?.goalKo, "아이폰 팔고 싶어");
assert.ok(state.run?.artifact?.checklist?.length);
assert.ok(
  state.run?.artifact?.checklist?.some((row) => row.id === "place"),
  "reconstruct must restore wizard checklist at resumed step",
);
assert.equal(readActiveRunState()?.lastVisitedNode, marketComposeRunNode("place"));

dispatchExecutionFeedGoal({ graphId: "composer:tab2", goalKo: "tab test" });
dispatchExecutionFeedArtifact({
  graphId: "composer:tab2",
  artifact: {
    kind: "checklist",
    tabs: [
      { id: "checklist", labelKo: "A" },
      { id: "prep", labelKo: "B" },
    ],
    activeTabId: "checklist",
  },
});
dispatchExecutionFeedArtifactTab("prep");
assert.equal(readExecutionFeedState().run?.artifact?.activeTabId, "prep");

const artifactCard = readFileSync(
  join(root, "components/globe/execution-feed/globe-execution-artifact-card.tsx"),
  "utf8",
);
assert.ok(
  artifactCard.includes("onTabChange"),
  "artifact tabs must be interactive",
);
assert.ok(
  artifactCard.includes('type="button"'),
  "artifact tabs must use buttons",
);

const feedHook = readFileSync(
  join(root, "hooks/use-globe-execution-feed.ts"),
  "utf8",
);
assert.ok(
  feedHook.includes("subscribeContextRunWatcher"),
  "feed hook must mount context run watcher",
);

const wizard = readFileSync(
  join(root, "components/globe/globe-market-intent-wizard-sheet.tsx"),
  "utf8",
);
assert.ok(
  wizard.includes("syncMarketWizardStepToFeed"),
  "wizard must live-sync steps to feed",
);

dispatchExecutionFeedClear();

console.log("test-context-run-watcher: ok");
