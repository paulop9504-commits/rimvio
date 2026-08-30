/**
 * Workspace Engine — smoke tests.
 */

import assert from "node:assert/strict";
import {
  MAP_VIEW_CONTRACT,
  PROPERTY_ONTOLOGY_V1,
  TRAVEL_ONTOLOGY_V1,
  bindObjectTypeToMapView,
  geoObjectsToMapPins,
  listDomainOntologySchemas,
  listViewContracts,
  planWorkspaceFromGoal,
  validateDomainOntologySchema,
  validateMapViewExtension,
  validateWorkspaceExtensionSubmission,
  workspaceMapPinToGeoObject,
} from "@/lib/workspace-engine";
import { ALL_STANDARDS } from "@/lib/hub/standards";

function testLayersAndProducers() {
  assert.ok(listViewContracts().some((c) => c.kind === "map"));
  assert.equal(listDomainOntologySchemas().length >= 2, true);
}

function testMapGeoBridge() {
  const pin = {
    id: "hotel-1",
    title: "Test Hotel",
    lat: 34.6937,
    lng: 135.5023,
    kind: "lodging" as const,
  };
  const geo = workspaceMapPinToGeoObject(pin);
  assert.equal(geo.latitude, pin.lat);
  const back = geoObjectsToMapPins([geo])[0]!;
  assert.equal(back.id, pin.id);
}

function testMapExtensionValidation() {
  const ok = validateMapViewExtension({
    extensionId: "ext.map.demo",
    contractKind: "map",
    contractVersion: "1.0.0",
    consumes: ["GeoObject"],
    supportsEvents: ["select", "hover", "open", "filter", "move"],
    permissions: ["read:location"],
    testObjectCount: 100,
  });
  assert.equal(ok.valid, true);

  const bad = validateMapViewExtension({
    extensionId: "ext.bad",
    contractKind: "map",
    contractVersion: "0.0.1",
    consumes: [],
    supportsEvents: [],
    permissions: [],
  });
  assert.equal(bad.valid, false);
}

function testOntologyValidation() {
  assert.equal(validateDomainOntologySchema(TRAVEL_ONTOLOGY_V1).valid, true);
  assert.equal(validateDomainOntologySchema(PROPERTY_ONTOLOGY_V1).valid, true);
}

function testWorkspaceComposition() {
  const plan = planWorkspaceFromGoal({
    goalSummaryKo: "부동산 투자할 만한 곳 찾아줘",
    domain: "property",
    ontology: PROPERTY_ONTOLOGY_V1,
    capabilityIds: ["property.search", "price.analysis"],
    preferredViews: ["map", "table"],
  });
  assert.equal(plan.domain, "property");
  assert.ok(plan.slots.some((s) => s.layer === "view" && s.artifactId === "map"));
  assert.equal(bindObjectTypeToMapView("Property").projection, "marker");
}

function testSubmissionPipeline() {
  const sub = validateWorkspaceExtensionSubmission({
    producerKind: "ontology",
    ontologySchema: TRAVEL_ONTOLOGY_V1,
  });
  assert.equal(sub.valid, true);
  assert.equal(sub.stage, "sandbox");
}

function testStandardsIntegration() {
  assert.equal(ALL_STANDARDS.length, 9);
  assert.ok(ALL_STANDARDS.some((s) => s.id === "wdk_overview"));
  assert.ok(ALL_STANDARDS.some((s) => s.id === "view_producer_guide"));
}

function testMapContractEvents() {
  assert.deepEqual(
    MAP_VIEW_CONTRACT.events.map((e) => e.id),
    ["select", "hover", "open", "filter", "move"],
  );
}

testLayersAndProducers();
testMapGeoBridge();
testMapExtensionValidation();
testOntologyValidation();
testWorkspaceComposition();
testSubmissionPipeline();
testStandardsIntegration();
testMapContractEvents();

console.log("test-workspace-engine: OK");
