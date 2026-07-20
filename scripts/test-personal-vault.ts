import assert from "node:assert/strict";
import {
  decryptVaultPayload,
  encryptVaultPayload,
  hashVaultPlaintext,
  buildPersonalVaultStoragePath,
} from "../lib/vault";
import { resolveVaultWriteClientResult } from "../lib/vault/vault-api-errors";

process.env.VAULT_ENCRYPTION_KEY = "test-vault-key-for-ci-only";

const userA = "11111111-1111-1111-1111-111111111111";
const userB = "22222222-2222-2222-2222-222222222222";

const payload = { eventId: "ec:test", title: "제주", place: "제주시" };

const cipherA = encryptVaultPayload(userA, payload);
const roundtrip = decryptVaultPayload<typeof payload>(userA, cipherA);
assert.equal(roundtrip.eventId, "ec:test");
assert.equal(roundtrip.title, "제주");

let threw = false;
try {
  decryptVaultPayload(userB, cipherA);
} catch {
  threw = true;
}
assert.equal(threw, true, "cross-tenant decrypt must fail");

assert.equal(hashVaultPlaintext(payload), hashVaultPlaintext({ ...payload }));

const path = buildPersonalVaultStoragePath(userA, "obj-1");
assert.equal(path, `${userA}/obj-1`);
assert.ok(!path.includes(".."));

// Legacy false-success: HTTP 200 + error body must not look like a save.
const legacyFail = resolveVaultWriteClientResult(200, {
  error: "relation user_vault_objects does not exist",
  hint: "vault_unavailable",
});
assert.equal(legacyFail.ok, false);
assert.ok(legacyFail.ok === false && legacyFail.error.includes("user_vault_objects"));

const migrationFail = resolveVaultWriteClientResult(200, {
  hint: "vault_migration_required",
});
assert.equal(migrationFail.ok, false);

const okWrite = resolveVaultWriteClientResult(200, { ok: true });
assert.equal(okWrite.ok, true);

const statusFail = resolveVaultWriteClientResult(503, {
  ok: false,
  error: "vault_write_failed",
  hint: "vault_unavailable",
});
assert.equal(statusFail.ok, false);

console.log("test-personal-vault: ok");
