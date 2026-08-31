import type { BlackBoxVerifyResult, CapabilityInvokeResult } from "@/lib/capability-runtime/types";

export function observeBlackBox(input: {
  readonly invoke: CapabilityInvokeResult;
  readonly expectedOutputKeys?: readonly string[];
  readonly maxLatencyMs?: number;
  readonly declaredNetwork?: boolean;
  readonly networkAttempted?: boolean;
}): BlackBoxVerifyResult {
  const maxLatencyMs = input.maxLatencyMs ?? 3_000;
  const output = input.invoke.output ?? {};
  const expected = input.expectedOutputKeys ?? [];
  const outputOk = expected.every((key) => key in output);
  const undeclaredNetwork = Boolean(input.networkAttempted && !input.declaredNetwork);
  const passed =
    input.invoke.ok &&
    outputOk &&
    input.invoke.latencyMs <= maxLatencyMs &&
    !undeclaredNetwork;

  return {
    passed,
    observations: {
      inputOk: true,
      outputOk,
      latencyMs: input.invoke.latencyMs,
      errorCount: input.invoke.ok ? 0 : 1,
      undeclaredNetwork,
      permissionOk: !undeclaredNetwork,
    },
    reasonKo: passed
      ? "블랙박스 검증 통과 — 소스는 보지 않았어요."
      : "출력·지연·네트워크 행동이 계약을 벗어났어요.",
  };
}
