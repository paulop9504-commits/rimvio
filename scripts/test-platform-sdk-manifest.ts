import assert from "node:assert/strict";
import {
  buildCapabilityIndexEntry,
  synthesizeCapabilitiesFromCollections,
  validateRimvioPlatformManifest,
} from "../lib/platform-sdk/manifest";
import { isForbiddenPlatformPermission } from "../lib/platform-sdk/permissions";
import {
  RIMVIO_PLATFORM_MANIFEST_VERSION,
  type RimvioPlatformManifest,
} from "../lib/platform-sdk/types";
import { createDefaultMarketsDeclaration } from "../lib/platform-sdk/markets";

const BASE_MANIFEST: RimvioPlatformManifest = {
  specVersion: RIMVIO_PLATFORM_MANIFEST_VERSION,
  package: {
    id: "platform.used-market",
    name: "Used Market",
    version: "1.0.0",
    description: "Neighborhood resale",
    category: "e-commerce",
    tags: ["marketplace"],
    pricing: "free",
    icon: null,
  },
  operator: { name: "A Studio Inc.", headquartersCountry: "KR" },
  markets: createDefaultMarketsDeclaration("KR"),
  runtime: {
    tier: "native",
    type: "cloud-agent",
    entry: "platform/index.ts",
    hostVersion: ">=1.0.0",
  },
  permissions: {
    required: ["browser.read", "data.listings.write"],
    optional: ["location.read"],
    denied: ["credential.extract"],
  },
  context: {
    read: [{ path: "user.id", type: "string" }],
    write: [],
  },
  data: {
    isolation: "tenant_strict",
    collections: [{ name: "listings", schema: "listing.v1", indexes: ["sellerId"] }],
  },
  capabilities: [
    {
      id: "market.create_listing",
      name: "Create listing",
      inputSchema: "market.create_listing.v1",
      outputSchema: "market.listing.v1",
      approvalRequired: true,
    },
  ],
  ui: {
    routes: [{ path: "/sell", surface: "page", component: "SellForm" }],
  },
  composition: { imports: [] },
  events: { emits: ["listing.created"], subscribes: [] },
};

function testValidManifest() {
  const result = validateRimvioPlatformManifest(BASE_MANIFEST);
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
}

function testForbiddenPermission() {
  const result = validateRimvioPlatformManifest({
    ...BASE_MANIFEST,
    permissions: {
      ...BASE_MANIFEST.permissions,
      required: ["auto_reality_commit"],
    },
  });
  assert.equal(result.valid, false);
  assert.equal(isForbiddenPlatformPermission("auto_reality_commit"), true);
}

function testSynthesizeCapabilities() {
  const caps = synthesizeCapabilitiesFromCollections("platform.used-market", ["listings"]);
  assert.ok(caps.some((c) => c.id.includes("create_listing")));
  assert.ok(caps.every((c) => c.synthesized));
}

function testCapabilityIndex() {
  const index = buildCapabilityIndexEntry(BASE_MANIFEST);
  assert.equal(index[0]?.capabilityId, "market.create_listing");
  assert.equal(index[0]?.platformId, "platform.used-market");
  assert.equal(index[0]?.marketCountry, "KR");
}

testValidManifest();
testForbiddenPermission();
testSynthesizeCapabilities();
testCapabilityIndex();

console.log("platform-sdk manifest: ok");
