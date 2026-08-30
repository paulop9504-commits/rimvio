/**
 * Producer / Reviewer Standard System — smoke tests.
 */

import assert from "node:assert/strict";
import {
  ALL_STANDARDS,
  CAPABILITY_STANDARD,
  MAIN_AGENT_CAPABILITY_POLICY,
  PRODUCER_GUIDE,
  PRODUCER_SUBMIT_CHECKLIST,
  REVIEWER_GUIDE,
  REVIEWER_SCORE_DIMENSIONS,
  RIMVIO_CAPABILITY_STANDARD_VERSION,
  inferSideEffectClass,
  lifecycleToCertificationLevel,
  resolveStandardById,
  searchStandards,
} from "@/lib/hub/standards";
import { resolveCapabilityIntent } from "@/lib/rimvio-index/resolve-capability-intent";
import { parseDevWorkspacePane } from "@/lib/hub/dev/dev-workspace-nav";

function testStandardDefinitions() {
  assert.equal(ALL_STANDARDS.length, 9);
  assert.equal(CAPABILITY_STANDARD.version, RIMVIO_CAPABILITY_STANDARD_VERSION);
  assert.equal(PRODUCER_GUIDE.role, "producer");
  assert.equal(REVIEWER_GUIDE.role, "reviewer");
  assert.ok(PRODUCER_SUBMIT_CHECKLIST.length >= 10);
  assert.equal(REVIEWER_SCORE_DIMENSIONS.length, 7);
  assert.ok(MAIN_AGENT_CAPABILITY_POLICY.priorityOrder[0] === "reuse");
}

function testSearchAndResolve() {
  const hits = searchStandards("Reuse");
  assert.ok(hits.length >= 2);
  const producer = resolveStandardById("producer_guide");
  assert.ok(producer?.sections.some((s) => s.id === "submit_checklist"));
}

function testSideEffectAndCertification() {
  assert.equal(inferSideEffectClass("hotel.search"), "READ");
  assert.equal(inferSideEffectClass("hotel.booking"), "TRANSACTION");
  assert.equal(inferSideEffectClass("delete_account"), "DESTRUCTIVE");
  assert.equal(lifecycleToCertificationLevel("PUBLISHED", true), "TRUSTED");
  assert.equal(lifecycleToCertificationLevel("DRAFT"), "UNVERIFIED");
}

function testPolicyWiredToIntent() {
  const resolution = resolveCapabilityIntent({
    utterance: "completely novel capability xyz 999",
  });
  assert.equal(resolution.policyVersion, RIMVIO_CAPABILITY_STANDARD_VERSION);
  assert.ok(resolution.reuse.decision);
}

function testWorkspaceNav() {
  assert.equal(parseDevWorkspacePane("standards", null), "standards");
}

testStandardDefinitions();
testSearchAndResolve();
testSideEffectAndCertification();
testPolicyWiredToIntent();
testWorkspaceNav();

console.log("test-hub-standards: OK");
