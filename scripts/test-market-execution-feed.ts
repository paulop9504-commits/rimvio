#!/usr/bin/env npx tsx
import assert from "node:assert/strict";

import { buildMarketWizardChecklist } from "../lib/context-run/build-market-wizard-checklist";
import {
  dispatchExecutionFeedClear,
  readExecutionFeedState,
} from "../lib/context-run/execution-feed-bridge";
import { syncMarketComposeStartToFeed } from "../lib/context-run/sync-market-compose-to-feed";

const listing = buildMarketWizardChecklist({
  role: "listing",
  skipRole: true,
  activeStep: "photos",
});
assert.ok(listing.length >= 5);
assert.equal(listing[0]?.id, "photos");
assert.equal(listing[0]?.done, false);
assert.ok(listing[0]?.priorityKo);

const seeking = buildMarketWizardChecklist({
  role: "seeking",
  skipRole: true,
  completedThroughStep: "recognize",
  activeStep: "priority",
});
const recognize = seeking.find((row) => row.id === "recognize");
assert.equal(recognize?.done, true);

dispatchExecutionFeedClear();
syncMarketComposeStartToFeed({
  composeText: "@중고 아이폰 15 프로 70만원",
});
const state = readExecutionFeedState();
assert.ok(state.run?.goalKo == null || state.run.graphId);
assert.equal(state.run?.artifact?.kind, "checklist");
assert.ok((state.run?.artifact?.checklist?.length ?? 0) > 0);
assert.ok(state.run?.artifact?.tabs?.some((tab) => tab.id === "checklist"));

dispatchExecutionFeedClear();

console.log("test-market-execution-feed: ok");
