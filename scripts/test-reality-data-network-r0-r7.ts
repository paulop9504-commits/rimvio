/**
 * Reality Data Network R0–R7 smoke tests.
 * Run: npx tsx scripts/test-reality-data-network-r0-r7.ts
 */

import assert from "node:assert/strict";
import {
  buildSuggestedRealityPatch,
  evaluateConsensus,
  decideSpawnRealityTaskFromTool,
  spawnLodgingPhotoAuthenticityTask,
  submitRealityData,
  applyVerifierResponse,
  resetRealityDataNetworkForTests,
  readRealityTasks,
} from "@/lib/reality-data-network";
import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import {
  getUnifiedContributorWallet,
  mergeCapabilityExecutionIntoContributorLedger,
  resetContributorLedgerForTests,
} from "@/lib/contributor-ledger";
import { resetCapabilityLedgerForTests } from "@/lib/capability-ledger";

function testR1TypesAndPreLabel() {
  const patch = buildSuggestedRealityPatch({
    domain: "lodging",
    targetLabelKo: "오사카 호텔 디럭스",
    ocr: { text: "double bed bathtub city view", provider: "tesseract" },
  });
  assert.equal(patch.epistemic, "inferred");
  assert.ok(patch.attributes.bathtub === true || patch.attributes.bed === "double");
}

function testR3AiPreLabelOnSubmit() {
  resetRealityDataNetworkForTests();
  resetContributorLedgerForTests();
  const { task } = submitRealityData({
    supplierId: "supplier-test",
    supplierLabel: "Test",
    titleKo: "객실",
    targetLabelKo: "오사카 호텔",
    domain: "lodging",
    taskType: "photo_authenticity",
    preLabel: { domain: "lodging", targetLabelKo: "오사카 호텔 더블룸" },
  });
  assert.ok(task.suggestedPatch);
  assert.ok(task.aiPreLabel);
}

function testR4Consensus() {
  resetRealityDataNetworkForTests();
  resetContributorLedgerForTests();
  const { task } = submitRealityData({
    supplierId: "s1",
    supplierLabel: "S",
    titleKo: "t",
    targetLabelKo: "target",
    domain: "lodging",
    taskType: "photo_authenticity",
  });

  applyVerifierResponse({
    taskId: task.taskId,
    verifierId: "v1",
    answerId: "yes",
    answerLabelKo: "YES",
  });
  applyVerifierResponse({
    taskId: task.taskId,
    verifierId: "v2",
    answerId: "yes",
    answerLabelKo: "YES",
  });
  const third = applyVerifierResponse({
    taskId: task.taskId,
    verifierId: "v3",
    answerId: "yes",
    answerLabelKo: "YES",
  });

  assert.equal(third.consensus.result.status, "resolved");
  assert.equal(third.consensus.result.confidence, 1);
  assert.equal(third.task?.status, "resolved");
}

function testR4Dispute() {
  const evaluation = evaluateConsensus({
    task: {
      taskId: "T1",
      taskType: "photo_authenticity",
      titleKo: "t",
      targetLabelKo: "x",
      domain: "lodging",
      options: [],
      difficulty: 2,
      baseRewardKrw: 10,
      requiredVerifiers: 3,
      consensusThreshold: 0.67,
      status: "in_review",
      supplierId: "s",
      supplierLabel: "S",
      submittedAt: new Date().toISOString(),
    },
    responses: [
      {
        responseId: "r1",
        taskId: "T1",
        verifierId: "a",
        answerId: "yes",
        answerLabelKo: "Y",
        at: new Date().toISOString(),
        latencyMs: 100,
      },
      {
        responseId: "r2",
        taskId: "T1",
        verifierId: "b",
        answerId: "no",
        answerLabelKo: "N",
        at: new Date().toISOString(),
        latencyMs: 100,
      },
      {
        responseId: "r3",
        taskId: "T1",
        verifierId: "c",
        answerId: "yes",
        answerLabelKo: "Y",
        at: new Date().toISOString(),
        latencyMs: 100,
      },
    ],
  });
  assert.equal(evaluation.result.status, "disputed");
}

function testR5LodgingSpawn() {
  resetRealityDataNetworkForTests();
  const row: ContextLodgingInventoryRow = {
    placeId: "p1",
    name: "Weak Photo Hotel",
    lat: 34.69,
    lng: 135.5,
    images: ["img1"],
    provider: "google_places",
    photoConfidence: "nearby_identity",
    photoSource: "google_places_nearby",
  };
  const result = spawnLodgingPhotoAuthenticityTask({ row, contextEventId: "evt-1" });
  assert.equal(result.spawned, true);
  assert.equal(result.reason, "photo_confidence");
  assert.ok(result.task?.taskType === "photo_authenticity");
}

function testR6ContributorLedger() {
  resetContributorLedgerForTests();
  mergeCapabilityExecutionIntoContributorLedger({
    executionId: "cexec-1",
    developerId: "dev-a",
    capabilityId: "BOOK_HOTEL",
    payoutKrw: 20,
  });
  const wallet = getUnifiedContributorWallet("dev-a");
  assert.equal(wallet.capabilityExecutionKrw, 20);
}

function testR7AgentSpawnDecision() {
  resetRealityDataNetworkForTests();
  const decision = decideSpawnRealityTaskFromTool({
    toolId: "hotel.lookup",
    verified: false,
    contextEventId: "evt-spawn",
    tool: {
      ok: true,
      toolId: "hotel.lookup",
      summaryKo: "3곳",
      candidates: [
        {
          id: "h1",
          labelKo: "Low Photo Inn",
          lat: 34.69,
          lng: 135.5,
          images: [],
          thumbnailUrl: null,
        },
      ],
    },
  });
  assert.equal(decision.type, "spawn_reality_task");
  if (decision.type === "spawn_reality_task") {
    assert.ok(decision.tasks.length >= 1);
    assert.ok(readRealityTasks().some((t) => t.spawnReason != null));
  }
}

function main() {
  resetRealityDataNetworkForTests();
  resetContributorLedgerForTests();
  resetCapabilityLedgerForTests();
  testR1TypesAndPreLabel();
  testR3AiPreLabelOnSubmit();
  testR4Consensus();
  testR4Dispute();
  testR5LodgingSpawn();
  testR6ContributorLedger();
  testR7AgentSpawnDecision();
  console.log("test-reality-data-network-r0-r7: all passed");
}

main();
