#!/usr/bin/env npx tsx
/**
 * Payment prep ↔ vault · multi-intent atom planner · Analyze Diff pick.
 */

import assert from "node:assert/strict";
import {
  composeActionPlanFromAtoms,
  isCompoundActionUtterance,
  parseNlIntentChain,
  shouldRunMultiIntentPlanner,
} from "../lib/action-planner";
import {
  resolvePaymentPrepMethodFromPreference,
  stampPaymentPrepPreviewFromVault,
} from "../lib/payment-vault";
import { runNaturalLanguagePipeline } from "../lib/context-run/run-natural-language-pipeline";
import {
  clearSessionGraphs,
  ensureSessionGraph,
  parseGraphCommands,
  readSessionGraph,
  resetGraphCommandStoreForTests,
  tryRunGraphCommandOs,
  writeSessionGraph,
} from "../lib/graph-command";
import { clearPreparedRealityOperations } from "../lib/reality-queue";
import { enqueuePaymentPrepOperation } from "../lib/reality-queue/enqueue-payment-prep-operation";
import { readPreparedRealityOperation } from "../lib/reality-queue/prepared-operations-store";
import { invokeRimvioTool } from "../lib/tool-registry";

async function main(): Promise<void> {
  resetGraphCommandStoreForTests();
  clearPreparedRealityOperations();
  clearSessionGraphs();

  // Vault resolver
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

  // ranking.pick summary includes why
  {
    const picked = invokeRimvioTool("ranking.pick", {
      query: "어느 게 낫아",
      candidates: [
        {
          id: "cheap",
          labelKo: "싼호텔",
          rating: 3.5,
          walkMinutes: 12,
          priceBand: 1,
          reservable: true,
        },
        {
          id: "good",
          labelKo: "좋은호텔",
          rating: 4.8,
          walkMinutes: 5,
          priceBand: 2,
          reservable: true,
          localFavorite: true,
        },
      ],
    });
    assert.ok(picked.pickedId);
    assert.match(picked.summaryKo, /골랐어요/);
    assert.match(picked.summaryKo, /평점|도보|현지|가격대/);
  }

  // Analyze pool pick on Diff — leaves sole selection, ranks visible pool
  {
    let graph = ensureSessionGraph({ contextEventId: "evt-reason" });
    graph = {
      ...graph,
      nodes: [
        {
          id: "low",
          labelKo: "저평점",
          kind: "lodging",
          lat: 34.66,
          lng: 135.5,
          rating: 3.0,
          walkMinutes: 20,
          reservable: true,
          localFavorite: false,
          priceBand: 3,
          pinned: false,
          visible: true,
          alwaysVisible: false,
          parentId: null,
          groupId: null,
          accent: "default",
          projectFolderKo: null,
          attrs: {},
        },
        {
          id: "high",
          labelKo: "고평점",
          kind: "lodging",
          lat: 34.67,
          lng: 135.51,
          rating: 4.9,
          walkMinutes: 4,
          reservable: true,
          localFavorite: true,
          priceBand: 2,
          pinned: false,
          visible: true,
          alwaysVisible: false,
          parentId: null,
          groupId: null,
          accent: "default",
          projectFolderKo: null,
          attrs: {},
        },
      ],
      selectionIds: ["low"],
    };
    writeSessionGraph(graph);

    const cmds = parseGraphCommands("어느 게 더 낫아?", graph);
    assert.equal(cmds[0]?.op, "reason_pick");

    const applied = tryRunGraphCommandOs({
      utterance: "어느 게 더 낫아?",
      contextEventId: "evt-reason",
    });
    assert.ok(applied && "ok" in applied && applied.ok);
    const after = readSessionGraph("evt-reason");
    assert.ok(after?.selectionIds[0]);
    const winner = after!.nodes.find((n) => n.attrs.reasonPick === true);
    assert.ok(winner);
    assert.equal(after!.selectionIds[0], winner!.id);
    assert.match(String(winner!.attrs.reasonSummaryKo ?? ""), /골랐어요/);
  }

  // payment_prep preview stamp (no vault → 없음 label)
  {
    clearPreparedRealityOperations();
    const op = enqueuePaymentPrepOperation({
      contextEventId: "evt-pay-stamp",
      placeId: "place-1",
      placeName: "APA",
    });
    const stamped = await stampPaymentPrepPreviewFromVault(op.operationId);
    assert.equal(stamped.stamped, true);
    assert.equal(stamped.needsVaultSettings, true);
    const stored = readPreparedRealityOperation(op.operationId);
    assert.match(stored?.preview.providerLabelKo ?? "", /없음/);
  }

  // Multi-intent contrast
  {
    const chain = parseNlIntentChain("예약은 말고 길만");
    assert.equal(shouldRunMultiIntentPlanner(chain), true);
    assert.ok(
      chain.atoms.some(
        (a) => a.polarity === "reject" && a.family === "Reserve",
      ),
    );
    assert.ok(
      chain.atoms.some((a) => a.polarity === "do" && a.family === "Navigate"),
    );
    const plan = composeActionPlanFromAtoms({
      utterance: "예약은 말고 길만",
      contextEventId: "evt-mi-nav",
      atoms: chain.atoms,
    });
    assert.ok(plan);
    assert.ok(plan!.steps.some((s) => s.kind === "soft_navigate"));
    assert.equal(
      plan!.steps.some((s) => s.graphCommand?.op === "reserve_prep"),
      false,
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
  }

  console.log("ok — payment-vault-multi-intent");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
