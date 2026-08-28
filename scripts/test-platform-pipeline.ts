import assert from "node:assert/strict";
import {
  capabilityDraftToPlatformManifest,
  exportPlatformManifestJson,
  importManifestIntoDraft,
  parsePlatformManifestJson,
} from "../lib/hub/capability/manifest-bridge";
import { createDefaultCapabilityDraft } from "../lib/hub/capability/defaults";
import {
  clearCapabilityIndexForTests,
  registerCapabilityIndexFromManifest,
  searchCapabilityIndex,
} from "../lib/platform-sdk/capability-index";
import { planCapabilityDiscovery } from "../lib/platform-sdk/discover-capabilities";
import {
  clearPlatformHostForTests,
  mountPlatformHostApis,
  resolvePlatformManifestFromIndex,
} from "../lib/platform-sdk/platform-host";
import {
  clearTenantDataForTests,
  readTenantCollectionSize,
} from "../lib/platform-sdk/tenant-data-store";
import { validateRimvioPlatformManifest } from "../lib/platform-sdk/manifest";
import { planCapabilityDiscovery } from "../lib/platform-sdk/discover-capabilities";
import { createDefaultMarketsDeclaration } from "../lib/platform-sdk/markets";

function testManifestBridge(): void {
  const draft = createDefaultCapabilityDraft();
  draft.name = "Test Market";
  draft.id = "used-market";
  draft.actions = [
    {
      id: "a1",
      name: "market.create_listing",
      description: "Create listing",
      inputSchema: "market.create_listing.v1",
      outputSchema: "market.listing.v1",
      approvalRequired: true,
    },
  ];

  const json = exportPlatformManifestJson(draft);
  const parsed = parsePlatformManifestJson(json);
  assert.equal(parsed.error, null);
  assert.ok(parsed.manifest);

  const roundTrip = importManifestIntoDraft(json, draft);
  assert.equal(roundTrip.error, null);
  assert.ok(roundTrip.draft);
  assert.equal(roundTrip.draft?.name, "Test Market");

  const manifest = capabilityDraftToPlatformManifest(draft);
  manifest.markets = createDefaultMarketsDeclaration("KR");
  const validation = validateRimvioPlatformManifest(manifest);
  assert.ok(validation.valid, validation.errors.join("; "));
}

function testCapabilityIndexAndDiscovery(): void {
  clearCapabilityIndexForTests();
  clearPlatformHostForTests();

  const draft = createDefaultCapabilityDraft();
  draft.id = "bike-market";
  draft.name = "Bike Market";
  draft.actions = [
    {
      id: "a1",
      name: "market.create_listing",
      description: "Sell items",
      inputSchema: "market.create_listing.v1",
      outputSchema: "market.listing.v1",
      approvalRequired: true,
    },
  ];
  const manifest = capabilityDraftToPlatformManifest(draft);
  registerCapabilityIndexFromManifest(manifest, "published");

  const hits = searchCapabilityIndex("자전거 팔고 싶어", { publishedOnly: true });
  assert.ok(hits.length > 0, "expected capability index hit");

  const plan = planCapabilityDiscovery({ utterance: "자전거 팔고 싶어" });
  assert.ok(plan);
  assert.match(plan!.capabilityId, /create_listing/);
}

async function testDataApiMount(): Promise<void> {
  clearTenantDataForTests();
  clearPlatformHostForTests();

  const apis = mountPlatformHostApis();
  await apis.data.create({
    platformId: "platform.test",
    collection: "listings",
    ownerUserId: "user_1",
    document: { title: "Bike", price: 100 },
  });
  assert.equal(readTenantCollectionSize("platform.test", "listings"), 1);
}

function testPlatformHostResolve(): void {
  clearPlatformHostForTests();
  const manifest = resolvePlatformManifestFromIndex("platform.used-market");
  assert.ok(manifest);
  assert.equal(manifest!.package.id, "platform.used-market");
  assert.ok(manifest!.ui.routes.length > 0);
}

function testPlanObjectDiscoveryHubPath(): void {
  const plan = planCapabilityDiscovery({ utterance: "중고 자전거 팔래" });
  assert.ok(plan, "seed index should match sell intent");
  void plan;
}

async function main(): Promise<void> {
  testManifestBridge();
  testCapabilityIndexAndDiscovery();
  await testDataApiMount();
  testPlatformHostResolve();
  testPlanObjectDiscoveryHubPath();
  console.log("test-platform-pipeline: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
