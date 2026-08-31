import assert from "node:assert/strict";
import { analyzePlatformIngress } from "../lib/hub/dev/platform-analyzer";
import { adaptApiEndpoints } from "../lib/hub/dev/rimvio-adapter";

async function testMarketAnalyzer(): Promise<void> {
  const result = await analyzePlatformIngress({
    kind: "github",
    value: "https://github.com/acme/used-market",
  });
  assert.ok(result);
  assert.ok(result!.capabilities.length >= 6);
  assert.ok(result!.capabilities.some((c) => c.capabilityId.includes("product")));
  assert.ok(result!.capabilities.some((c) => c.approvalRequired));
  assert.equal(result!.draft.actions.length, result!.capabilities.length);
}

function testAdapterPermissions(): void {
  const adapter = adaptApiEndpoints([
    { method: "GET", path: "/products", summary: "search" },
    { method: "POST", path: "/payments/commit", summary: "pay" },
  ]);
  assert.equal(adapter.permissionSummary.read, 1);
  assert.equal(adapter.permissionSummary.financial, 1);
  assert.ok(adapter.capabilities[1]!.approvalRequired);
}

async function testDescribeIngress(): Promise<void> {
  const result = await analyzePlatformIngress({
    kind: "describe",
    value: "호텔 예약 플랫폼 오사카",
  });
  assert.ok(result);
  assert.match(result!.platformName, /OsakaStay/i);
}

async function main(): Promise<void> {
  await testMarketAnalyzer();
  testAdapterPermissions();
  await testDescribeIngress();
  console.log("test-hub-platform-analyzer: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
