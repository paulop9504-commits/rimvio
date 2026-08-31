export type {
  BlackBoxObservation,
  BlackBoxVerifyResult,
  CapabilityContract,
  CapabilityDeployModel,
  CapabilityInvokeLog,
  CapabilityInvokeRequest,
  CapabilityInvokeResult,
  GitHubRepoConnector,
  SecretReference,
  SignedCapabilityArtifact,
} from "@/lib/capability-runtime/types";

export {
  CAPABILITY_DEPLOY_MODELS,
  DEFAULT_CAPABILITY_DEPLOY_MODEL,
} from "@/lib/capability-runtime/types";

export { connectGitHubRepo, githubConnectorScopeLabel, agentMayReceiveGitHubToken } from "@/lib/capability-runtime/github-connector";
export {
  putSecretReference,
  resolveSecretForRuntime,
  redactSecrets,
  injectSecretsEphemeral,
  resetSecretVaultForTests,
} from "@/lib/capability-runtime/secret-manager";
export { signCapabilityArtifact, verifySignedArtifact } from "@/lib/capability-runtime/signed-artifact";
export { admitCapabilityInvoke } from "@/lib/capability-runtime/policy-gateway";
export { observeBlackBox } from "@/lib/capability-runtime/black-box-verify";
export { invokeCapabilityIsolated } from "@/lib/capability-runtime/invoke";
