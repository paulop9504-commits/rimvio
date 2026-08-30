import assert from "node:assert/strict";
import {
  admitCapabilityInvoke,
  agentMayReceiveGitHubToken,
  connectGitHubRepo,
  invokeCapabilityIsolated,
  observeBlackBox,
  putSecretReference,
  redactSecrets,
  resetSecretVaultForTests,
  resolveSecretForRuntime,
  signCapabilityArtifact,
  verifySignedArtifact,
  type CapabilityContract,
} from "../lib/capability-runtime";

resetSecretVaultForTests();

assert.equal(agentMayReceiveGitHubToken(), false);

const connector = connectGitHubRepo({
  installationId: "inst-1",
  owner: "acme",
  repo: "coupang-search",
});
assert.equal(connector.accountWide, false);
assert.deepEqual(connector.permissions, ["contents:read"]);

const contract: CapabilityContract = {
  capabilityId: "commerce.coupang.search",
  version: "1.0.0",
  inputSchemaId: "search.in",
  outputSchemaId: "search.out",
  permissionLevel: 1,
  trust: "VERIFIED",
  deployModel: "private_artifact",
  secretRefs: ["COUPANG_API_KEY"],
  sourceVisible: false,
};

const denied = admitCapabilityInvoke({
  request: {
    capabilityId: "commerce.coupang.search",
    agentId: "main",
    input: { q: "shoes", accessToken: "ghs_secret" },
  },
  contract,
});
assert.equal(denied.admitted, false);

const artifact = signCapabilityArtifact({
  capabilityId: "commerce.coupang.search",
  bytes: "bundle-bytes",
  sourceRepo: "acme/coupang-search",
});
assert.equal(verifySignedArtifact(artifact), true);

putSecretReference(
  { ref: "COUPANG_API_KEY", ownerProducerId: "dev-a", capabilityId: contract.capabilityId },
  "sk-live-supersecret",
);
assert.equal(
  resolveSecretForRuntime({
    ref: "COUPANG_API_KEY",
    ownerProducerId: "dev-a",
    capabilityId: contract.capabilityId,
  }),
  "sk-live-supersecret",
);
assert.match(redactSecrets("API_KEY=sk-live-supersecret"), /••••|sk-•/);

const invoked = invokeCapabilityIsolated({
  request: { capabilityId: contract.capabilityId, agentId: "main", input: { q: "shoes" } },
  contract,
  artifact,
  handler: (input) => ({ items: [`hit:${String(input.q)}`] }),
});
assert.equal(invoked.ok, true);
assert.deepEqual(invoked.output, { items: ["hit:shoes"] });

const boxed = observeBlackBox({
  invoke: invoked,
  expectedOutputKeys: ["items"],
  networkAttempted: false,
});
assert.equal(boxed.passed, true);

const unverified: CapabilityContract = { ...contract, trust: "UNVERIFIED" };
const blockedTrust = invokeCapabilityIsolated({
  request: { capabilityId: contract.capabilityId, agentId: "main", input: { q: "x" } },
  contract: unverified,
  artifact,
});
assert.equal(blockedTrust.ok, false);

console.log("test-capability-runtime: ok");
