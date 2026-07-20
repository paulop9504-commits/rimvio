#!/usr/bin/env npx tsx
/**
 * Payment prep ↔ vault · multi-intent atom planner.
 */

import assert from "node:assert/strict";
import {
  composeActionPlanFromAtoms,
  isCompoundActionUtterance,
  parseNlIntentChain,
  shouldRunMultiIntentPlanner,
} from "../lib/action-planner";
import { resolvePaymentPrepMethodFromPreference } from "../lib/payment-vault";
import { runNaturalLanguagePipeline } from "../lib/context-run/run-natural-language-pipeline";
import {
  clearSessionGraphs,
  ensureSessionGraph,
  resetGraphCommandStoreForTests,
  writeSessionGraph,
} from "../lib/graph-command";
import { clearPreparedRealityOperations } from "../lib/reality-queue";

resetGraphCommandStoreForTests();
clearPreparedRealityOperations();
clearSessionGraphs();

// Vault resolver
{
  assert.equal(resolvePaymentPrepMethodFromPreference(null), null);
  const resolved = resolvePaymentPrepMethodFromPreference({
    version: 1,
    method: "kakaopay",
    displayLabelKo: "카카오페이",
    savedAtIso: new Date().toISOString(),
  });
  assert.ok(resolved);
  assert.equal(resolved!.method, "kakaopay");
  assert.equal(resolved!.labelKo, "카카오페이");
}

// Multi-intent contrast — reject preserved
{
  const chain = parseNlIntentChain("예약은 말고 길만");
  assert.equal(shouldRunMultiIntentPlanner(chain), true);
  assert.ok(chain.atoms.some((a) => a.polarity === "reject" && a.family === "Reserve"));
  assert.ok(chain.atoms.some((a) => a.polarity === "do" && a.family === "Navigate"));
  assert.equal(isCompoundActionUtterance("예약은 말고 길만"), true);

  const plan = composeActionPlanFromAtoms({
    utterance: "예약은 말고 길만",
    contextEventId: "evt-mi-nav",
    atoms: chain.atoms,
  });
  assert.ok(plan);
  assert.ok(plan!.steps.some((s) => s.kind === "soft_navigate"));
  assert.equal(
    plan!.steps.some(
      (s) => s.graphCommand?.op === "reserve_prep",
    ),
    false,
  );
}

{
  const chain = parseNlIntentChain("아니 그거 말고 두 번째");
  assert.equal(chain.isMulti, true);
  assert.ok(chain.atoms.some((a) => a.polarity === "reject"));
  assert.ok(
    chain.atoms.some(
      (a) => a.polarity === "do" && a.family === "Select" && a.selection?.ordinal === 1,
    ),
  );
}

{
  const chain = parseNlIntentChain("찾아서 결제하고 공유해");
  assert.equal(chain.isMulti, true);
  const families = chain.atoms.map((a) => a.family);
  assert.ok(families.includes("Search"));
  assert.ok(families.includes("Purchase"));
  assert.ok(families.includes("Share"));
}

// Pipeline: reject Reserve → action_plan navigate (not Field reserve)
{
  let graph = ensureSessionGraph({ contextEventId: "evt-mi-pipe" });
  graph = {
    ...graph,
    nodes: [
      {
        id: "n1",
        labelKo: "APA",
        kind: "lodging",
        lat: 34.66,
        lng: 135.5,
        rating: 4,
        walkMinutes: 5,
        reservable: true,
        localFavorite: false,
        priceBand: 2,
        pinned: true,
        visible: true,
        alwaysVisible: false,
        parentId: null,
        groupId: null,
        accent: "default",
        projectFolderKo: null,
        attrs: {},
      },
    ],
    selectionIds: ["n1"],
  };
  writeSessionGraph(graph);

  const run = runNaturalLanguagePipeline({
    utterance: "예약은 말고 길만",
    contextEventId: "evt-mi-pipe",
  });
  assert.ok(run.result);
  assert.ok(
    run.result.via === "action_plan" || run.result.via === "soft_command",
  );
  if (run.result.via === "action_plan") {
    assert.equal(run.result.waitingCommit, false);
  }
}

console.log("ok — payment-vault-multi-intent");
