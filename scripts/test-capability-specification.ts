import assert from "node:assert/strict";
import { compileCapabilitySpecificationFromId } from "../lib/rimvio-protocol/capability-specification";
import { resolveCapabilityRuntimeRequirements } from "../lib/platform-sdk/runtime-requirements";

function testHotelSearchSpec(): void {
  const spec = compileCapabilitySpecificationFromId("hotel.search", {
    description: "Find hotels in Tokyo",
  });

  assert.equal(spec.intent.discoveryDomain, "lodging");
  assert.ok(spec.input.fields.includes("destination"));
  assert.ok(spec.requirements.runtimeTypes.includes("browser"));
  assert.ok(spec.conditions.success.some((c) => c.code === "results_non_empty"));
  assert.ok(spec.conditions.failure.some((c) => c.code === "runtime_unavailable"));
}

function testRequirementsFromSpec(): void {
  const reqs = resolveCapabilityRuntimeRequirements("hotel.search");
  assert.ok(reqs.required.includes("browser"));
  assert.ok(reqs.preferredRuntimeTypes.includes("browser"));
  assert.equal(reqs.specification.runtimeTypes[0], "browser");
}

function testSameCapabilityDifferentImplConcept(): void {
  const a = compileCapabilitySpecificationFromId("hotel.search");
  const b = compileCapabilitySpecificationFromId("hotel.search");
  assert.deepEqual(a.intent, b.intent);
  assert.deepEqual(a.input.schemaId, b.input.schemaId);
  assert.deepEqual(a.output.schemaId, b.output.schemaId);
}

function main(): void {
  testHotelSearchSpec();
  testRequirementsFromSpec();
  testSameCapabilityDifferentImplConcept();
  console.log("test-capability-specification: ok");
}

main();
