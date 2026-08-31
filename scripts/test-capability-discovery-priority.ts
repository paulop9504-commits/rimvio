import assert from "node:assert/strict";
import {
  clearCapabilityIndexForTests,
  readCapabilityIndex,
  registerCapabilityIndexFromManifest,
  searchCapabilityIndex,
} from "../lib/platform-sdk/capability-index";
import { planCapabilityDiscovery } from "../lib/platform-sdk/discover-capabilities";
import { capabilityDraftToPlatformManifest } from "../lib/hub/capability/manifest-bridge";
import { createDefaultCapabilityDraft } from "../lib/hub/capability/defaults";
import { inferDiscoveryIntentDomain } from "../lib/platform-sdk/score-capability-discovery";

function seedOsakaStayHotel(published: boolean): void {
  const draft = createDefaultCapabilityDraft();
  draft.id = "osaka-stay";
  draft.name = "OsakaStay";
  draft.actions = [
    {
      id: "h1",
      name: "hotel.search",
      description: "Search hotels",
      inputSchema: "hotel.search.v1",
      outputSchema: "hotel.search_result.v1",
      approvalRequired: false,
    },
  ];
  const manifest = capabilityDraftToPlatformManifest(draft);
  registerCapabilityIndexFromManifest(manifest, published ? "PUBLISHED" : "TESTING", {
    rimvioCertified: true,
    capabilityFilter: ["hotel.search"],
  });
}

function testHotelUtteranceNoPublishedFallback(): void {
  clearCapabilityIndexForTests();
  const domain = inferDiscoveryIntentDomain("도쿄에서 호텔 찾아줘");
  assert.equal(domain, "lodging");

  const hits = searchCapabilityIndex("도쿄에서 호텔 찾아줘", { publishedOnly: true });
  assert.equal(hits.length, 0, "no published hotel cap → no hub hits");

  const plan = planCapabilityDiscovery({ utterance: "도쿄에서 호텔 찾아줘" });
  assert.equal(plan, null, "fallback to native agent when no published hotel capability");
}

function testHotelUtteranceDoesNotMatchUsedMarket(): void {
  clearCapabilityIndexForTests();
  const plan = planCapabilityDiscovery({ utterance: "도쿄에서 호텔 찾아줘" });
  assert.equal(plan, null);

  const marketPlan = planCapabilityDiscovery({ utterance: "중고 자전거 팔고 싶어" });
  assert.ok(marketPlan);
  assert.match(marketPlan!.capabilityId, /create_listing/);
}

function testHotelPublishedWinsWithScores(): void {
  clearCapabilityIndexForTests();
  seedOsakaStayHotel(true);

  const plan = planCapabilityDiscovery({ utterance: "도쿄에서 호텔 찾아줘" });
  assert.ok(plan);
  assert.equal(plan!.capabilityId, "hotel.search");
  assert.ok(plan!.scores.intentMatch >= 0.9);
  assert.ok(plan!.scores.composite >= 0.55);
}

function testDraftHotelNotDiscoverable(): void {
  clearCapabilityIndexForTests();
  seedOsakaStayHotel(false);

  const index = readCapabilityIndex();
  assert.ok(index.some((e) => e.capabilityId === "hotel.search"));
  const plan = planCapabilityDiscovery({ utterance: "오사카 호텔 찾아줘" });
  assert.equal(plan, null, "TESTING status must not appear in agent discovery");
}

function main(): void {
  testHotelUtteranceNoPublishedFallback();
  testHotelUtteranceDoesNotMatchUsedMarket();
  testHotelPublishedWinsWithScores();
  testDraftHotelNotDiscoverable();
  console.log("test-capability-discovery-priority: ok");
}

main();
