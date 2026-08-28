import assert from "node:assert/strict";
import {
  compileIntentFromUtterance,
  buildPlatformContract,
  evaluatePolicyMvp,
  isRimvioOsEntityKind,
  satisfiesCapabilityRange,
} from "../lib/rimvio-protocol";
import { createDefaultMarketsDeclaration } from "../lib/platform-sdk/markets";
import { RIMVIO_PLATFORM_MANIFEST_VERSION, type RimvioPlatformManifest } from "../lib/platform-sdk/types";

const intent = compileIntentFromUtterance("내 자전거 팔고 싶어");
assert.ok(intent);
assert.equal(intent!.action, "sell");
assert.equal(intent!.object, "bicycle");
assert.equal(intent!.market, "KR");

assert.ok(isRimvioOsEntityKind("platform"));
assert.equal(isRimvioOsEntityKind("hotel"), false);

assert.ok(satisfiesCapabilityRange("1.2.0", ">=1.1"));

const manifest: RimvioPlatformManifest = {
  specVersion: RIMVIO_PLATFORM_MANIFEST_VERSION,
  package: {
    id: "platform.used-market",
    name: "Used Market",
    version: "1.0.0",
    description: "test",
    category: "e-commerce",
    tags: [],
    pricing: "free",
    icon: null,
  },
  operator: { name: "A Studio", headquartersCountry: "KR" },
  markets: createDefaultMarketsDeclaration("KR"),
  runtime: { tier: "native", type: "cloud-agent", entry: "x", hostVersion: ">=1" },
  permissions: { required: [], optional: [], denied: [] },
  context: { read: [], write: [] },
  data: { collections: [], isolation: "tenant_strict" },
  capabilities: [
    {
      id: "market.purchase",
      name: "Purchase",
      inputSchema: "market.purchase.v1",
      outputSchema: "market.order.v1",
      approvalRequired: true,
    },
  ],
  ui: { routes: [] },
  composition: { imports: [] },
  events: { emits: [], subscribes: [] },
};

const contract = buildPlatformContract(manifest);
assert.equal(contract.capabilities.length, 1);
assert.equal(contract.capabilities[0]!.approvalPolicy, "user_required");

const policy = evaluatePolicyMvp({
  userId: "u1",
  platformId: "platform.used-market",
  capabilityId: "market.purchase",
  action: "buy",
  context: {
    user: {
      id: "u1",
      accountCountry: "KR",
    },
    locale: { language: "ko", currency: "KRW" },
    market: { country: "KR" },
    atIso: new Date().toISOString(),
  },
});
assert.equal(policy.decision, "require_approval");

console.log("rimvio-protocol: ok");
