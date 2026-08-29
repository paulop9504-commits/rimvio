/**
 * P0 Remote Hub Federation — regression tests.
 */

import {
  clearConnectedHubsForTests,
  clearHubScanCacheForTests,
  clearCredentialVaultForTests,
  connectRemoteHub,
  scanRemoteHub,
  searchFederatedCapabilities,
  selectBestFederatedCapability,
  invokeRemoteCapability,
  invokeWithFailover,
  planCrossHubComposition,
  planFederatedCapabilityDiscovery,
  checkRemotePermission,
  SHOPPING_HUB,
  SHOPPING_PERMISSIONS,
  TRAVEL_PARTNER_HUBS,
  probeHubHealth,
} from "@/lib/hub/federation";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function testConnectAndScan() {
  clearConnectedHubsForTests();
  clearHubScanCacheForTests();
  clearCredentialVaultForTests();

  const result = await connectRemoteHub({
    hubUrl: "https://shopping-hub.demo.rimvio.app",
    label: "Shopping Hub",
    hubId: SHOPPING_HUB.hubId,
    authToken: "demo-token",
  });
  assert(result.ok, "connect ok");
  assert(result.scan!.capabilities.some((c) => c.capabilityId === "product.search"), "product.search");
  assert(result.scan!.capabilities.some((c) => c.capabilityId === "delivery.track"), "delivery.track");
  assert(result.allowedPermissions.length > 0, "allowed perms");
  assert(result.deniedPermissions.some((d) => d.includes("payment.prepare.commit")), "denied commit");
  console.log("connect + scan OK");
}

async function testDiscoveryAndInvoke() {
  await connectRemoteHub({ hubUrl: SHOPPING_HUB.baseUrl, label: "Shopping Hub", hubId: SHOPPING_HUB.hubId });

  const hits = searchFederatedCapabilities({ utterance: "10만원 이하 무선 이어폰 찾아줘" });
  assert(hits.some((h) => h.capabilityId === "product.search"), "federated search product.search");

  const best = selectBestFederatedCapability("무선 이어폰 search");
  assert(best?.capabilityId === "product.search", "best capability");

  const plan = planFederatedCapabilityDiscovery({ utterance: "10만원 이하 무선 이어폰" });
  assert(plan?.remoteExecution === true, "remote execution plan");
  assert(plan?.capabilityId === "product.search", "plan capability");

  const invoke = await invokeRemoteCapability({
    hubId: SHOPPING_HUB.hubId,
    capabilityId: "product.search",
    input: { maxPriceKrw: 100_000 },
  });
  assert(invoke.ok, "invoke ok");
  assert(Array.isArray((invoke.output as { items?: unknown[] })?.items), "search items");
  console.log("discovery + invoke OK");
}

async function testPermissionAndHealth() {
  const perm = checkRemotePermission({
    capabilityId: "payment.prepare",
    action: "commit",
    grants: SHOPPING_PERMISSIONS,
  });
  assert(!perm.allowed, "payment commit denied");

  const probe = await probeHubHealth(SHOPPING_HUB);
  assert(probe.summary.degradedCount >= 1 || probe.summary.offlineCount >= 1, "health states");
  console.log("permission + health OK");
}

async function testFailoverAndComposition() {
  await connectRemoteHub({ hubUrl: SHOPPING_HUB.baseUrl, label: "Shopping Hub", hubId: SHOPPING_HUB.hubId });
  const scan = await scanRemoteHub(SHOPPING_HUB);

  const failover = await invokeWithFailover({
    capabilityId: "product.search",
    candidates: scan.capabilities,
    payload: { maxPriceKrw: 90_000 },
  });
  assert(failover.ok, "failover invoke");

  for (const hub of TRAVEL_PARTNER_HUBS) {
    await connectRemoteHub({ hubUrl: hub.baseUrl, label: hub.label, hubId: hub.hubId });
  }

  const composition = planCrossHubComposition("오사카 여행 전체 준비해줘 호텔 맛집 기차 예약 결제");
  assert(composition && composition.steps.length >= 3, "cross-hub composition");
  console.log("failover + composition OK");
}

async function main() {
  await testConnectAndScan();
  await testDiscoveryAndInvoke();
  await testPermissionAndHealth();
  await testFailoverAndComposition();
  console.log("All federation P0 tests passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
