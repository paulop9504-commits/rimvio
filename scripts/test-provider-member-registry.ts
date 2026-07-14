import assert from "node:assert/strict";
import {
  getProviderNetworkMember,
  listProviderNetworkMembers,
  listPublishedEngineManifests,
  publishCapabilityPackage,
  registerProviderNetworkMember,
  resetMarketplaceForTests,
} from "../lib/marketplace/rimvio-marketplace";
import { FIXTURE_NAVIGATE_KAKAO_PACKAGE } from "../lib/marketplace/marketplace-test-fixtures";

resetMarketplaceForTests();
listPublishedEngineManifests();

const rimvio = getProviderNetworkMember("rimvio");
assert.ok(rimvio);
assert.equal(rimvio.kind, "ai_agent");
assert.equal(rimvio.displayLabel, "Rimvio");
assert.ok((rimvio.engineManifestIds?.length ?? 0) >= 5);
assert.ok(rimvio.capabilityIds?.includes("BOOK_HOTEL"));

const acme = getProviderNetworkMember("acme_hotels");
assert.ok(acme);
assert.equal(acme.kind, "organization");
assert.ok(acme.engineManifestIds?.includes("eng-lodging-search-acme-1"));

const organizations = listProviderNetworkMembers({ kind: "organization" });
assert.ok(organizations.some((row) => row.memberId === "acme_hotels"));

const registered = registerProviderNetworkMember({
  memberId: "local_guide_co",
  kind: "worker",
  displayLabel: "Local Guide Co",
  capabilityIds: ["NAVIGATE"],
});
assert.equal(registered.ok, true);
if (registered.ok) {
  assert.equal(registered.member.kind, "worker");
}

publishCapabilityPackage(FIXTURE_NAVIGATE_KAKAO_PACKAGE);
const kakao = getProviderNetworkMember("kakao-corp");
assert.ok(kakao);
assert.equal(kakao.kind, "organization");
assert.ok(kakao.capabilityIds?.includes("NAVIGATE"));

const lodgingManifests = listPublishedEngineManifests("lodging_search");
assert.equal(lodgingManifests.length, 2);

console.log("test-provider-member-registry: ok");
