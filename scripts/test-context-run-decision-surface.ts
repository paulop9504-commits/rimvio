#!/usr/bin/env npx tsx
import assert from "node:assert/strict";

import {
  assertCommitPermitted,
  ContextRunCommitBlockedError,
} from "../lib/context-run/commit-gate";
import {
  decideRiskOperation,
  decideRunTurn,
  mergeExecutionDecision,
} from "../lib/context-run/execution-decision";
import {
  assertSurfaceMatchesDecision,
  resolvePrimarySurface,
  surfacesAllowedForDecision,
} from "../lib/context-run/surface-resolver";

assert.equal(decideRiskOperation("publish_external"), "approval_required");
assert.equal(decideRiskOperation("payment"), "approval_required");
assert.equal(decideRiskOperation("handshake_confirm"), "approval_required");
assert.equal(decideRiskOperation("none"), "auto");

assert.equal(
  mergeExecutionDecision("auto", "approval_required"),
  "approval_required",
);
assert.equal(mergeExecutionDecision("ask", "recommend"), "ask");

assert.throws(
  () => assertCommitPermitted({ risk: "publish_external" }),
  ContextRunCommitBlockedError,
);
assert.doesNotThrow(() =>
  assertCommitPermitted({
    risk: "publish_external",
    approvalGranted: true,
  }),
);
assert.doesNotThrow(() =>
  assertCommitPermitted({
    risk: "publish_external",
    autoEnvelope: "market_quick_list_one_liner",
  }),
);

const publishTurn = resolvePrimarySurface({
  graphId: "run:1",
  node: { id: "approval_publish" },
});
assert.equal(publishTurn.decision, "approval_required");
assert.equal(publishTurn.surface, "approval_dialog");
assert.equal(publishTurn.effect, "open_approval");
assert.equal(publishTurn.commitPermitted, false);

const publishApproved = resolvePrimarySurface({
  graphId: "run:1",
  node: { id: "approval_publish" },
  risk: "publish_external",
  approvalGranted: true,
});
assert.equal(publishApproved.commitPermitted, true);

const matchDone = resolvePrimarySurface({
  graphId: "run:2",
  node: { id: "match_done" },
});
assert.equal(matchDone.surface, "field_discovery_ingress");
assert.equal(matchDone.decision, "recommend");

assert.throws(() =>
  assertSurfaceMatchesDecision({
    decision: "approval_required",
    surface: "portal",
  }),
);

assert.ok(
  surfacesAllowedForDecision("ask").includes("question_card"),
);
assert.ok(!surfacesAllowedForDecision("approval_required").includes("portal"));

assert.equal(
  decideRunTurn({ node: "match_running", risk: "publish_external" }),
  "approval_required",
);

console.log("test-context-run-decision-surface: ok");
