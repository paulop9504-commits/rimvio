/**
 * ADR-066 — Platform Economy Flywheel tests.
 * Run: npx tsx scripts/test-platform-economy-adr066.ts
 */

import { evaluateReuseGate } from "@/lib/rimvio-index/reuse-gate";
import {
  resetImprovementTasksForTests,
  spawnImprovementTaskFromReuseGate,
  readImprovementTasks,
} from "@/lib/rimvio-index/improvement-task-pool";
import { resolveCapabilityIntent } from "@/lib/rimvio-index/resolve-capability-intent";
import { computeContributorRewardV2 } from "@/lib/contributor-ledger/reward-formula-v2";
import {
  resetContributorLedgerForTests,
  readContributorLedger,
} from "@/lib/contributor-ledger";
import {
  resetBusinessSupplyForTests,
  submitBusinessSupply,
  readBusinessSupplies,
} from "@/lib/hub/data/business-supply";
import {
  resetRealityDataNetworkForTests,
  upsertContributorProfile,
} from "@/lib/reality-data-network";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

async function main() {
  resetImprovementTasksForTests();
  resetContributorLedgerForTests();
  resetBusinessSupplyForTests();
  resetRealityDataNetworkForTests();

  // Reuse gate — market search hits seed index
  const gate = evaluateReuseGate({ utterance: "중고거래 market search 찾아줘" });
  assert(
    gate.decision === "reuse" || gate.decision === "improve",
    `expected reuse/improve for market, got ${gate.decision} (${gate.similarity})`,
  );
  console.log("reuse-gate:", gate.decision, gate.reasonKo);

  if (gate.decision === "improve") {
    const task = spawnImprovementTaskFromReuseGate({
      reuse: gate,
      utterance: "중고거래 market search 찾아줘",
    });
    assert(task != null, "improvement task spawned");
    assert(readImprovementTasks().length >= 1, "improvement task in pool");
  }

  const resolution = resolveCapabilityIntent({
    utterance: "market search 중고거래",
  });
  assert(resolution.reuse.decision.length > 0, "capability intent resolved");
  console.log("capability-intent:", resolution.workLogKo);

  // Reward v2
  const reward = computeContributorRewardV2({
    baseRewardKrw: 100,
    qualityMultiplier: 1.2,
    difficulty: 3,
    verificationConfidence: 0.9,
    uniquenessScore: 0.8,
    usageWeight: 1,
  });
  assert(reward.amountKrw > 100, "reward v2 should exceed base with multipliers");
  console.log("reward-v2:", reward.amountKrw, reward.factors);

  // Business supply
  upsertContributorProfile({
    contributorId: "business-demo",
    displayName: "데모 호텔",
    roles: ["business"],
    accuracyPct: 100,
    reliabilityTier: "new",
    qualityMultiplier: 1,
    totalEarnedKrw: 0,
    tasksCompleted: 0,
    verifierApproved: false,
  });
  submitBusinessSupply({
    businessId: "business-demo",
    businessLabel: "데모 호텔",
    domain: "lodging",
    kind: "price",
    targetLabelKo: "디럭스 더블",
    payload: { value: "₩120,000 / 1박" },
  });
  assert(readBusinessSupplies().length === 1, "business supply recorded");
  assert(
    readContributorLedger().some((e) => e.kind === "business_supply"),
    "business_supply ledger entry",
  );

  console.log("test-platform-economy-adr066: all passed");
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
