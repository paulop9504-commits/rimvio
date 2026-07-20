#!/usr/bin/env npx tsx
/**
 * Osaka 30s demo runner — trip → APA → food → local → reserve → pause.
 * Approve / rewind / cancel are separate control APIs.
 */

import assert from "node:assert/strict";
import {
  OSAKA_30S_DEMO_STEPS,
  approveOsaka30sDemo,
  cancelOsaka30sDemo,
  continueOsaka30sDemo,
  rewindOsaka30sDemo,
  runOsaka30sDemo,
} from "../lib/globe/osaka-demo";
import {
  clearSessionGraphs,
  projectSessionGraphCompareArcs,
  readSessionGraph,
  resetGraphCommandStoreForTests,
} from "../lib/graph-command";
import {
  clearPreparedRealityOperations,
  listPreparedRealityOperations,
} from "../lib/reality-queue";
import { resetEventCandidatesForTests } from "../lib/events/event-store";

async function main(): Promise<void> {
  resetGraphCommandStoreForTests();
  clearPreparedRealityOperations();
  clearSessionGraphs();
  resetEventCandidatesForTests();

  assert.equal(OSAKA_30S_DEMO_STEPS.length, 6);
  assert.equal(OSAKA_30S_DEMO_STEPS[5]?.id, "approve");

  const seen: string[] = [];
  let flew = false;

  const paused = await runOsaka30sDemo({
    stepDelayMs: 0,
    onProgress: (p) => {
      if (p.status === "done" && p.stepId) {
        seen.push(p.stepId);
      }
      if (p.status === "awaiting_approve") {
        seen.push("awaiting");
      }
    },
    onFlyTo: () => {
      flew = true;
    },
  });

  assert.equal(paused.status, "awaiting_approve");
  assert.equal(paused.awaitingHuman, true);
  assert.equal(paused.done, false);
  assert.ok(paused.contextEventId);
  assert.ok(flew);
  assert.ok(seen.includes("trip"));
  assert.ok(seen.includes("pin_apa"));
  assert.ok(seen.includes("nearby_food"));
  assert.ok(seen.includes("local_filter"));
  assert.ok(seen.includes("first_reserve"));
  assert.ok(seen.includes("awaiting"));

  const graph = readSessionGraph(paused.contextEventId!);
  assert.ok(graph);
  assert.ok(
    graph!.nodes.some((n) => n.kind === "lodging" && n.pinned),
    "APA lodging pinned",
  );
  assert.ok(
    graph!.nodes.some((n) => n.kind === "eatery"),
    "eatery nodes present",
  );
  assert.ok(
    graph!.nodes.some((n) => n.kind === "compare") ||
      graph!.edges.some((e) => e.kind === "compare"),
    "compare graph present",
  );
  const arcs = projectSessionGraphCompareArcs(graph);
  assert.ok(arcs.length >= 1, "compare arcs projectable");
  assert.ok(
    arcs.every((arc) => arc.linkStyle === "signal"),
    "hairline signal only",
  );
  const ops = listPreparedRealityOperations().filter(
    (op) => op.contextEventId === paused.contextEventId,
  );
  assert.ok(ops.length >= 1, "reserve prep in inbox");

  const rewound = rewindOsaka30sDemo();
  assert.ok(rewound);
  assert.equal(rewound!.awaitingHuman, false);
  assert.ok(rewound!.canRewind);

  const continued = await continueOsaka30sDemo();
  assert.ok(continued);
  assert.equal(continued!.status, "awaiting_approve");

  const approved = await approveOsaka30sDemo();
  assert.equal(approved.done, true);
  assert.equal(approved.status, "done");

  // Fresh run + cancel
  resetGraphCommandStoreForTests();
  clearPreparedRealityOperations();
  clearSessionGraphs();
  resetEventCandidatesForTests();

  const again = await runOsaka30sDemo({ stepDelayMs: 0 });
  assert.equal(again.status, "awaiting_approve");
  const cancelled = cancelOsaka30sDemo();
  assert.equal(cancelled.errorKo, "cancelled");
  assert.equal(
    listPreparedRealityOperations().filter(
      (op) => op.contextEventId === again.contextEventId,
    ).length,
    0,
  );

  console.log("ok — osaka-30s-demo-ui");
}

void main();
