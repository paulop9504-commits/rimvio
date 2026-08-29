/**
 * Agent verification — test / deploy gate results.
 */

export type VerificationResult = {
  readonly ok: boolean;
  readonly detail: string;
  readonly kind: "test" | "deploy" | "schema" | "tool";
};

export function verifyTestResult(data: { passed: number; total: number; ok: boolean }): VerificationResult {
  return {
    ok: data.ok,
    detail: `${data.passed}/${data.total} passed`,
    kind: "test",
  };
}

export function verifyDeployPrepare(data: { valid: boolean; error?: string }): VerificationResult {
  return {
    ok: data.valid,
    detail: data.valid ? "Publish 준비 완료" : data.error ?? "manifest invalid",
    kind: "deploy",
  };
}
