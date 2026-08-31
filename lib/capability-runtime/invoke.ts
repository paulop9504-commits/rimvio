import { admitCapabilityInvoke } from "@/lib/capability-runtime/policy-gateway";
import { redactSecrets } from "@/lib/capability-runtime/secret-manager";
import { verifySignedArtifact } from "@/lib/capability-runtime/signed-artifact";
import type {
  CapabilityContract,
  CapabilityInvokeRequest,
  CapabilityInvokeResult,
  SignedCapabilityArtifact,
} from "@/lib/capability-runtime/types";

export type IsolatedInvokeInput = {
  readonly request: CapabilityInvokeRequest;
  readonly contract: CapabilityContract;
  readonly artifact?: SignedCapabilityArtifact;
  readonly handler?: (input: Readonly<Record<string, unknown>>) => Readonly<Record<string, unknown>>;
};

/**
 * Isolated execution — adapter only. Agent never clones a repo here.
 */
export function invokeCapabilityIsolated(input: IsolatedInvokeInput): CapabilityInvokeResult {
  const started = Date.now();
  const admit = admitCapabilityInvoke({
    request: input.request,
    contract: input.contract,
  });
  if (!admit.admitted) {
    return fail(input.request.capabilityId, started, admit.reasonKo, []);
  }

  if (input.contract.deployModel === "private_artifact") {
    if (!input.artifact || !verifySignedArtifact(input.artifact)) {
      return fail(input.request.capabilityId, started, "서명된 Artifact가 없거나 검증에 실패했어요.", []);
    }
    if (input.artifact.capabilityId !== input.contract.capabilityId) {
      return fail(input.request.capabilityId, started, "Artifact가 이 Capability의 것이 아니에요.", []);
    }
  }

  try {
    const output = input.handler?.(input.request.input) ?? { ok: true };
    const rawLog = `invoke ${input.contract.capabilityId} ok`;
    return {
      ok: true,
      capabilityId: input.contract.capabilityId,
      output,
      latencyMs: Date.now() - started,
      logs: { lines: [redactSecrets(rawLog)] },
      usedSecretRefs: input.contract.secretRefs,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "invoke_failed";
    return fail(input.request.capabilityId, started, redactSecrets(message), input.contract.secretRefs);
  }
}

function fail(
  capabilityId: string,
  started: number,
  errorKo: string,
  usedSecretRefs: readonly string[],
): CapabilityInvokeResult {
  return {
    ok: false,
    capabilityId,
    output: null,
    latencyMs: Date.now() - started,
    errorKo: redactSecrets(errorKo),
    logs: { lines: [redactSecrets(errorKo)] },
    usedSecretRefs,
  };
}
