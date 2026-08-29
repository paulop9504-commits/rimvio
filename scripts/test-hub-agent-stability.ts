import assert from "node:assert/strict";
import {
  clearCapabilityIndexForTests,
  registerCapabilityIndexFromManifestWithValidation,
  searchCapabilityIndex,
} from "../lib/platform-sdk/capability-index";
import {
  parseSchemaRef,
  validateSchemaPublishTransition,
  isAgentCompatibleWithSchema,
} from "../lib/platform-sdk/capability-schema-version";
import {
  clearDiscoveryCacheForTests,
  getCachedRankingPlan,
} from "../lib/platform-sdk/discovery-cache";
import { planCapabilityDiscovery } from "../lib/platform-sdk/discover-capabilities";
import {
  clearCapabilityApprovalPendingForTests,
  createCapabilityApprovalPending,
  readCapabilityApprovalPending,
} from "../lib/platform-sdk/capability-approval-pending";
import {
  fuseCanonicalResults,
  normalizeCapabilityOutput,
} from "../lib/platform-sdk/canonical-capability-result";
import { capabilityDraftToPlatformManifest } from "../lib/hub/capability/manifest-bridge";
import { createDefaultCapabilityDraft } from "../lib/hub/capability/defaults";
import { createDefaultMarketsDeclaration } from "../lib/platform-sdk/markets";

function testSchemaVersionPublishGate(): void {
  const existing = {
    inputSchema: "market.create_listing.v1",
    outputSchema: "market.listing.v1",
  };
  const majorBump = validateSchemaPublishTransition(existing, {
    inputSchema: "market.create_listing.v2",
    outputSchema: "market.listing.v2",
  });
  assert.equal(majorBump.ok, true);

  const downgrade = validateSchemaPublishTransition(
    { inputSchema: "market.create_listing.v2", outputSchema: "market.listing.v2" },
    { inputSchema: "market.create_listing.v1", outputSchema: "market.listing.v1" },
  );
  assert.equal(downgrade.ok, false);

  const parsed = parseSchemaRef("hotel.search.v1");
  assert.ok(parsed);
  assert.equal(parsed!.family, "hotel.search");
  assert.equal(parsed!.version, 1);
  assert.equal(isAgentCompatibleWithSchema("hotel.search.v1"), true);
  assert.equal(isAgentCompatibleWithSchema("hotel.search.v2"), false);
}

function testIndexRegisterRejectsBreakingSchema(): void {
  clearCapabilityIndexForTests();

  const draft = createDefaultCapabilityDraft();
  draft.id = "schema-gate-market";
  draft.name = "Schema Gate Market";
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
  const manifest = capabilityDraftToPlatformManifest(draft);
  manifest.markets = createDefaultMarketsDeclaration("KR");

  const first = registerCapabilityIndexFromManifestWithValidation(manifest, "PUBLISHED");
  assert.equal(first.registered.length, 1);
  assert.equal(first.rejected.length, 0);

  draft.actions[0] = {
    ...draft.actions[0]!,
    inputSchema: "market.create_listing.v2",
    outputSchema: "market.listing.v2",
  };
  const bumpedManifest = capabilityDraftToPlatformManifest(draft);
  bumpedManifest.markets = createDefaultMarketsDeclaration("KR");
  const bumped = registerCapabilityIndexFromManifestWithValidation(bumpedManifest, "PUBLISHED");
  assert.equal(bumped.registered.length, 1);

  draft.actions[0] = {
    ...draft.actions[0]!,
    inputSchema: "market.create_listing.v1",
    outputSchema: "market.listing.v1",
  };
  const brokenManifest = capabilityDraftToPlatformManifest(draft);
  brokenManifest.markets = createDefaultMarketsDeclaration("KR");

  const second = registerCapabilityIndexFromManifestWithValidation(brokenManifest, "PUBLISHED");
  assert.equal(second.registered.length, 0);
  assert.equal(second.rejected.length, 1);
}

function testDiscoveryCache(): void {
  clearCapabilityIndexForTests();
  clearDiscoveryCacheForTests();

  const utterance = "자전거 팔고 싶어";
  const first = planCapabilityDiscovery({ utterance });
  assert.ok(first);

  const cached = getCachedRankingPlan(utterance, "KR", () => null);
  assert.ok(cached.plan);
  assert.equal(cached.cacheHit, true);

  const hits = searchCapabilityIndex(utterance, { publishedOnly: true, limit: 3 });
  assert.ok(hits.length > 0);
}

function testApprovalPendingStore(): void {
  clearCapabilityApprovalPendingForTests();

  const plan = planCapabilityDiscovery({ utterance: "자전거 팔고 싶어" });
  assert.ok(plan);

  const pending = createCapabilityApprovalPending({
    utterance: "자전거 팔고 싶어",
    plan,
    platformHref: "/platform/test",
  });
  assert.equal(pending.status, "awaiting_user");

  const readBack = readCapabilityApprovalPending(pending.pendingId);
  assert.ok(readBack);
  assert.equal(readBack!.plan.capabilityId, plan.capabilityId);
}

function testCanonicalNormalizeAndFuse(): void {
  const items = normalizeCapabilityOutput(
    {
      items: [
        { id: "l1", title: "로드 자전거", price: { amount: 120000, currency: "KRW" } },
        { id: "l2", title: "x" },
      ],
    },
    {
      platformId: "platform.used-market",
      capabilityId: "market.search",
      platformName: "Used Market",
    },
  );
  assert.equal(items.length, 1);
  assert.equal(items[0]!.title, "로드 자전거");

  const fused = fuseCanonicalResults([
    { items },
    {
      items: normalizeCapabilityOutput(
        { title: "로드 자전거", id: "l1", priceKrw: 125000 },
        {
          platformId: "platform.alt-market",
          capabilityId: "market.search",
        },
      ),
    },
  ]);
  assert.ok(fused.length >= 1);
}

function main(): void {
  testSchemaVersionPublishGate();
  testIndexRegisterRejectsBreakingSchema();
  testDiscoveryCache();
  testApprovalPendingStore();
  testCanonicalNormalizeAndFuse();
  console.log("test-hub-agent-stability: ok");
}

main();
