import assert from "node:assert/strict";
import {
  decryptVaultPayload,
  encryptVaultPayload,
  hashVaultPlaintext,
  buildPersonalVaultStoragePath,
} from "../lib/vault";

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

console.log("test-personal-vault: ok");
