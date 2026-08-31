/**
 * Capability Execution Ledger — P0–P5 smoke tests.
 * Run: npx tsx scripts/test-capability-ledger.ts
 */

import assert from "node:assert/strict";
import {
  applyCompositionRevenueSplit,
  computeUsageWeight,
  deriveExecutionStatus,
  finalizeCapabilityExecution,
  getDeveloperWallet,
  getLedgerEntry,
  readChildExecutions,
  readLedgerEntries,
  recordAgentCompositeExecution,
  recordCapabilityExecution,
  resetCapabilityLedgerForTests,
  resolveCapabilityIdForTool,
  rollupPayoutByDeveloper,
  TIER_UNIT_PRICE_KRW,
  unitPriceKrwForTool,
} from "@/lib/capability-ledger";

function testP0TierAndRecord() {
  resetCapabilityLedgerForTests();
  assert.equal(resolveCapabilityIdForTool("hotel.lookup"), "BOOK_HOTEL");
  assert.equal(unitPriceKrwForTool("hotel.lookup"), TIER_UNIT_PRICE_KRW.T1);

  const entry = recordCapabilityExecution({
    toolId: "hotel.lookup",
    toolOk: true,
    candidateCount: 5,
    ledgerContext: {
      userRequestId: "req-1",
      agentId: "lodging",
      developerId: "dev-hotel",
    },
  });
  assert.ok(entry.executionId.startsWith("cexec-"));
  assert.ok(entry.payoutKrw >= 10);
  assert.equal(readLedgerEntries().length, 1);
}

function testP2UsageWeight() {
  const empty = deriveExecutionStatus({
    toolId: "hotel.lookup",
    toolOk: true,
    candidateCount: 0,
  });
  assert.equal(empty, "empty");

  const weight = computeUsageWeight({
    toolId: "ranking.pick",
    toolOk: true,
    candidateCount: 5,
    verified: true,
    pickedId: "h1",
  });
  assert.ok(weight >= 1.5);
}

function testP4Composition() {
  resetCapabilityLedgerForTests();
  const parent = recordAgentCompositeExecution({
    agentId: "lodging",
    userRequestId: "req-trip",
    developerId: "creator-a",
  });

  recordCapabilityExecution({
    toolId: "hotel.lookup",
    toolOk: true,
    candidateCount: 3,
    ledgerContext: {
      userRequestId: "req-trip",
      parentExecutionId: parent.executionId,
      developerId: "creator-b",
    },
  });
  recordCapabilityExecution({
    toolId: "ranking.pick",
    toolOk: true,
    candidateCount: 3,
    pickedId: "x",
    ledgerContext: {
      userRequestId: "req-trip",
      parentExecutionId: parent.executionId,
      developerId: "creator-c",
    },
  });

  assert.equal(readChildExecutions(parent.executionId).length, 2);
  const split = applyCompositionRevenueSplit(parent.executionId);
  assert.ok(split);
  assert.ok(split!.parentPayoutKrw >= 0);
  assert.ok(getLedgerEntry(parent.executionId)!.payoutKrw === split!.parentPayoutKrw);
}

function testP1Finalize() {
  resetCapabilityLedgerForTests();
  const prelim = recordCapabilityExecution({
    toolId: "restaurant.lookup",
    toolOk: true,
    candidateCount: 0,
    ledgerContext: { userRequestId: "req-2" },
  });
  assert.equal(prelim.executionStatus, "empty");

  const finalized = finalizeCapabilityExecution({
    executionId: prelim.executionId,
    executionStatus: "success",
    outputQuality: 0.85,
    usageWeight: 1.1,
    verified: true,
  });
  assert.ok(finalized);
  assert.equal(finalized!.finalized, true);
  assert.equal(finalized!.payoutKrw, Math.round(10 * 1.1));
}

function testP5Wallet() {
  resetCapabilityLedgerForTests();
  recordCapabilityExecution({
    toolId: "hotel.lookup",
    toolOk: true,
    candidateCount: 2,
    ledgerContext: { developerId: "dev-a", userRequestId: "r1" },
  });
  const entry = recordCapabilityExecution({
    toolId: "ranking.pick",
    toolOk: true,
    candidateCount: 2,
    ledgerContext: { developerId: "dev-a", userRequestId: "r1" },
  });
  finalizeCapabilityExecution({
    executionId: entry.executionId,
    executionStatus: "success",
    outputQuality: 0.9,
    usageWeight: 1.5,
    verified: true,
  });

  const wallet = getDeveloperWallet("dev-a");
  assert.ok(wallet.totalPayoutKrw > 0);
  const rollup = rollupPayoutByDeveloper();
  assert.ok(rollup.some((r) => r.developerId === "dev-a"));
}

function testHumanGateZeroPayout() {
  resetCapabilityLedgerForTests();
  const entry = recordCapabilityExecution({
    toolId: "booking.prepare",
    toolOk: true,
    waitingCommit: true,
    ledgerContext: { userRequestId: "req-book" },
  });
  assert.equal(entry.payoutKrw, 0);
  assert.equal(entry.executionStatus, "blocked");
}

function main() {
  testP0TierAndRecord();
  testP2UsageWeight();
  testP4Composition();
  testP1Finalize();
  testP5Wallet();
  testHumanGateZeroPayout();
  console.log("test-capability-ledger: all passed");
}

main();
