/**
 * Reality Data Network panels — smoke test.
 * Run: npx tsx scripts/test-reality-data-network-panels.ts
 */

import assert from "node:assert/strict";
import {
  applyVerifierApplication,
  applyVerifierResponse,
  readRealityTasks,
  resetRealityDataNetworkForTests,
  submitRealityData,
} from "@/lib/reality-data-network";
import {
  parseDataSupplierPane,
  parseDataVerifierPane,
  DATA_SUPPLIER_NAV,
  DATA_VERIFIER_NAV,
} from "@/lib/hub/data/data-workspace-nav";

function main() {
  resetRealityDataNetworkForTests();

  assert.equal(parseDataSupplierPane("submit"), "submit");
  assert.equal(parseDataVerifierPane("pool"), "task_pool");
  assert.ok(DATA_SUPPLIER_NAV.length >= 4);
  assert.ok(DATA_VERIFIER_NAV.length >= 5);

  const { task } = submitRealityData({
    supplierId: "supplier-test",
    supplierLabel: "Test Supplier",
    titleKo: "테스트 객실",
    targetLabelKo: "오사카 테스트 호텔",
    domain: "lodging",
    taskType: "photo_authenticity",
  });
  assert.ok(task.taskId.startsWith("TASK-"));

  applyVerifierApplication({
    contributorId: "verifier-test",
    displayName: "Verifier Test",
  });

  applyVerifierResponse({
    taskId: task.taskId,
    verifierId: "verifier-test",
    answerId: "yes",
    answerLabelKo: "YES",
  });

  const tasks = readRealityTasks();
  assert.ok(tasks.some((t) => t.taskId === task.taskId));

  console.log("test-reality-data-network-panels: ok");
}

main();
