#!/usr/bin/env npx tsx
/**
 * Workspace SDK Host actions — Focus advance · Action · Commit Field open.
 */

import assert from "node:assert/strict";
import { buildWorkspaceSdkFrame } from "../lib/workspace-sdk";
import {
  runWorkspaceSdkFocusAdvance,
  runWorkspaceSdkCommit,
} from "../lib/workspace-sdk/run-workspace-sdk-host-actions";

{
  const frame = buildWorkspaceSdkFrame({
    kind: "travel",
    headerTitleKo: "Osaka Trip",
    contextEventId: "evt-sdk-host",
    focusSlotId: "flight",
    focusLabelKo: "항공",
    lifecycle: "focused",
  });
  const next = runWorkspaceSdkFocusAdvance({ frame });
  assert.equal(next.ok, true);
  if (next.ok) {
    assert.equal(next.frame.primaryFocus.slotId, "hotel");
    assert.match(next.frame.primaryFocus.labelKo, /숙소/);
  }
}

{
  const frame = buildWorkspaceSdkFrame({
    kind: "travel",
    headerTitleKo: "Osaka Trip",
    contextEventId: "evt-sdk-commit",
    focusSlotId: "hotel",
    lifecycle: "action_ready",
  });
  const commit = runWorkspaceSdkCommit({ frame });
  assert.equal(commit.ok, true);
  if (commit.ok) {
    assert.equal(commit.frame.lifecycle, "awaiting_commit");
    assert.equal(commit.openedField, true);
  }
}

console.log("ok — workspace-sdk-host-actions");
