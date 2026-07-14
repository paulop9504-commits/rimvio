import assert from "node:assert/strict";
import { FIXTURE_ACME_LODGING_ENGINE_MANIFEST } from "../lib/marketplace/marketplace-test-fixtures";
import { indexProviderMemberFromEngineManifest } from "../lib/marketplace/provider-member-registry";
import {
  providerNetworkMemberFromDbRow,
  providerNetworkMemberToDbPayload,
} from "../lib/marketplace/server/provider-network-member-row";

const member = indexProviderMemberFromEngineManifest(FIXTURE_ACME_LODGING_ENGINE_MANIFEST);
const payload = providerNetworkMemberToDbPayload(member);
assert.equal(payload.member_id, "acme_hotels");
assert.equal(payload.kind, "organization");
assert.ok(payload.capability_ids.includes("BOOK_HOTEL"));
assert.ok(payload.engine_manifest_ids.includes("eng-lodging-search-acme-1"));

const roundTrip = providerNetworkMemberFromDbRow({
  member_id: payload.member_id,
  kind: payload.kind,
  display_label: payload.display_label,
  capability_ids: payload.capability_ids,
  engine_manifest_ids: payload.engine_manifest_ids,
  created_at: "2026-07-10T00:00:00.000Z",
  updated_at: payload.updated_at,
});
assert.ok(roundTrip);
assert.equal(roundTrip?.memberId, "acme_hotels");
assert.equal(roundTrip?.displayLabel, "ACME Hotels");

console.log("test-provider-member-supabase-row: ok");
