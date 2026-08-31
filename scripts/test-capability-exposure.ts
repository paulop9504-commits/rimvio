import assert from "node:assert/strict";
import { clearCapabilityIndexForTests } from "../lib/platform-sdk/capability-index";
import { planCapabilityDiscovery } from "../lib/platform-sdk/discover-capabilities";
import {
  planCapabilityExposure,
  resolveCapabilityExposurePolicy,
} from "../lib/platform-sdk/capability-exposure-policy";
import { classifyCapability } from "../lib/platform-sdk/capability-classification";
import { searchCapabilityIndex } from "../lib/platform-sdk/capability-index";
import { clearDiscoveryCacheForTests } from "../lib/platform-sdk/discovery-cache";
import { projectCapabilityExperience } from "../lib/platform-sdk/capability-ui-projection";

function testDesignExposurePipeline(): void {
  clearCapabilityIndexForTests();
  clearDiscoveryCacheForTests();

  const utterance = "이 CAD 파일 가운데 구멍을 10mm로 만들어줘";
  const hits = searchCapabilityIndex(utterance, { limit: 8, publishedOnly: true });
  const exposure = planCapabilityExposure({ utterance, hits });
  assert.ok(exposure, "expected design exposure plan");
  assert.equal(exposure!.experienceLabelKo, "설계 수정");
  assert.ok(exposure!.pipeline.length >= 2);
  assert.ok(
    exposure!.pipeline.some((s) => s.capabilityId === "design.edit"),
    "edit should be in pipeline",
  );
  assert.ok(
    !exposure!.pipeline.some((s) => s.capabilityId === "design.delete"),
    "delete must not be exposed",
  );

  const plan = planCapabilityDiscovery({ utterance });
  assert.ok(plan);
  assert.equal(plan!.capabilityId, "design.edit");
  assert.ok(plan!.exposure);
}

function testExposurePolicy(): void {
  const deletePolicy = resolveCapabilityExposurePolicy("design.delete", {
    approvalRequired: true,
    indexStatus: "PUBLISHED",
  });
  assert.equal(deletePolicy.exposure, "hidden");
  assert.equal(deletePolicy.agentAutoExecute, false);

  const editPolicy = resolveCapabilityExposurePolicy("design.edit", {
    approvalRequired: true,
    indexStatus: "PUBLISHED",
  });
  assert.equal(classifyCapability("design.edit"), "edit");
  assert.equal(editPolicy.userApprovalRequired, true);
  assert.equal(editPolicy.discoverable, true);
}

function testExperienceProjection(): void {
  const exp = projectCapabilityExperience({
    utterance: "가운데 구멍 10mm로",
    capabilityId: "design.edit",
    experienceLabelKo: "설계 수정",
    awaitingApproval: true,
  });
  assert.equal(exp.title, "Design");
  assert.equal(exp.hidePlatformBranding, true);
  assert.match(exp.workLogKo, /10 mm/);
  assert.ok(exp.actions.some((a) => a.label === "적용"));
}

function main(): void {
  testExposurePolicy();
  testDesignExposurePipeline();
  testExperienceProjection();
  console.log("test-capability-exposure: ok");
}

main();
