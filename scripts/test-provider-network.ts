import assert from "node:assert/strict";
import {
  listPublishedEngineManifests,
  normalizePublishedEngineManifest,
  readProviderMemberId,
  withProviderMemberRef,
} from "../lib/marketplace/rimvio-marketplace";
import { FIXTURE_NAVIGATE_KAKAO_PACKAGE } from "../lib/marketplace/marketplace-test-fixtures";
import { normalizePublishedCapabilityPackage } from "../lib/marketplace/normalize-provider-member-ref";

assert.equal(
  readProviderMemberId({ publisherId: "naver-corp" }),
  "naver-corp",
);

assert.equal(
  readProviderMemberId({
    publisherId: "legacy-publisher",
    providerMemberId: "member-ssot",
  }),
  "member-ssot",
);

const aliased = withProviderMemberRef({ publisherId: "rimvio" });
assert.equal(aliased.providerMemberId, "rimvio");
assert.equal(aliased.publisherId, "rimvio");

const engineManifest = listPublishedEngineManifests("lodging_search")[0];
assert.ok(engineManifest);
assert.equal(engineManifest.providerMemberId, "rimvio");
assert.equal(engineManifest.publisherId, "rimvio");
assert.equal(engineManifest.providerKind, "ai_agent");
assert.equal(readProviderMemberId(engineManifest), "rimvio");

const normalizedPkg = normalizePublishedCapabilityPackage(FIXTURE_NAVIGATE_KAKAO_PACKAGE);
assert.equal(normalizedPkg.providerMemberId, "kakao-corp");
assert.equal(normalizedPkg.publisherId, "kakao-corp");

const fromMemberOnly = normalizePublishedEngineManifest({
  ...engineManifest!,
  providerMemberId: "acme_hotels",
  publisherId: "",
  providerKind: "organization",
});
assert.equal(fromMemberOnly.providerMemberId, "acme_hotels");
assert.equal(fromMemberOnly.publisherId, "acme_hotels");

console.log("test-provider-network: ok");
