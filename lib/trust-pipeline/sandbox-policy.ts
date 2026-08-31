import type { SandboxPolicy } from "@/lib/trust-pipeline/types";

export const UNTRUSTED_SANDBOX_POLICY: SandboxPolicy = {
  ephemeral: true,
  maxCpuMs: 2_000,
  maxMemoryMb: 128,
  maxWallMs: 8_000,
  network: "deny",
  filesystem: "scratch_only",
  secrets: "zero",
  productionDb: false,
};

export type SandboxViolation = {
  readonly id: string;
  readonly messageKo: string;
};

/** Untrusted code never sees production surfaces — policy is fail-closed. */
export function evaluateSandboxPolicy(input: {
  readonly source: string;
  readonly policy?: SandboxPolicy;
}): { readonly ok: boolean; readonly violations: readonly SandboxViolation[] } {
  const policy = input.policy ?? UNTRUSTED_SANDBOX_POLICY;
  const violations: SandboxViolation[] = [];

  if (policy.secrets !== "zero") {
    violations.push({ id: "secrets", messageKo: "Untrusted sandbox는 secret이 0이어야 해요." });
  }
  if (policy.productionDb !== false) {
    violations.push({ id: "prod_db", messageKo: "Production DB 접근은 허용되지 않아요." });
  }
  if (policy.network !== "deny") {
    violations.push({ id: "network", messageKo: "기본 네트워크는 차단이어야 해요." });
  }

  if (/process\.env|SUPABASE_SERVICE_ROLE|INTEGRATIONS_ENCRYPTION_KEY/.test(input.source)) {
    violations.push({ id: "secret_reach", messageKo: "시크릿에 닿을 수 있는 코드는 샌드박스에서 거절해요." });
  }
  if (/deleteProductionDatabase|production\.supabase|rimvio\.com\/admin/i.test(input.source)) {
    violations.push({ id: "prod_reach", messageKo: "프로덕션 표면에 닿을 경로가 있어요." });
  }

  return { ok: violations.length === 0, violations };
}
