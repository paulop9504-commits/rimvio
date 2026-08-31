import assert from "node:assert/strict";
import {
  previewRuntimeRouter,
  routeRuntimeExecute,
  selectBestRuntimeForCapability,
} from "../lib/rimvio-core/runtime-router";
import { clearCapabilityIndexForTests, registerCapabilityIndexFromManifest } from "../lib/platform-sdk/capability-index";
import { capabilityDraftToPlatformManifest } from "../lib/hub/capability/manifest-bridge";
import { createDefaultCapabilityDraft } from "../lib/hub/capability/defaults";
import { clearPlatformHostForTests } from "../lib/platform-sdk/platform-host";

function seedHotelCapability(): void {
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
  registerCapabilityIndexFromManifest(capabilityDraftToPlatformManifest(draft), "PUBLISHED", {
    rimvioCertified: true,
    capabilityFilter: ["hotel.search"],
  });
}

function testHotelSearchSelectsBrowserRuntimeA(): void {
  const ranked = previewRuntimeRouter({
    capabilityId: "hotel.search",
    platformId: "platform.osaka-stay",
    utterance: "도쿄에서 호텔 찾아줘",
  });

  assert.ok(ranked.length >= 2, "expected multiple browser runtimes");
  assert.equal(ranked[0]!.runtime.id, "rimvio.browser-runtime");
  assert.ok(ranked[0]!.scores.composite > ranked[1]!.scores.composite);
  assert.equal(ranked[0]!.runtime.operational.latencyMsP50, 320);
}

function testIndustrialRuntimeExcludedForHotel(): void {
  const ranked = previewRuntimeRouter({ capabilityId: "hotel.search" });
  assert.ok(!ranked.some((r) => r.runtime.id === "factory.runtime"));
}

async function testRouterExecuteAndFallback(): Promise<void> {
  clearPlatformHostForTests();
  seedHotelCapability();

  const failFirst = await routeRuntimeExecute({
    platformId: "platform.osaka-stay",
    utterance: "호텔 찾아줘",
    action: {
      toolId: "hotel.search",
      capabilityId: "hotel.search",
      input: { utterance: "호텔 찾아줘", forceFailRuntime: true },
      approvalPolicy: "none",
    },
    maxAttempts: 2,
  });

  assert.equal(failFirst.attemptedRuntimeIds[0], "rimvio.browser-runtime");
  assert.ok(failFirst.ok, "should fallback to next ranked runtime");
  assert.equal(failFirst.routedVia, "router-fallback");
  assert.notEqual(failFirst.runtimeId, "rimvio.browser-runtime");
  assert.equal(failFirst.attemptedRuntimeIds[0], "rimvio.browser-runtime");
}

function testSelectBestReturnsScores(): void {
  const best = selectBestRuntimeForCapability({
    capabilityId: "hotel.search",
    utterance: "호텔",
  });
  assert.ok(best);
  assert.equal(best!.scores.capabilityMatch, 1);
  assert.ok(best!.scores.health >= 0.99);
}

async function main(): Promise<void> {
  testHotelSearchSelectsBrowserRuntimeA();
  testIndustrialRuntimeExcludedForHotel();
  testSelectBestReturnsScores();
  await testRouterExecuteAndFallback();
  console.log("test-runtime-router: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
