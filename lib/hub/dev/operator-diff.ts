/**
 * Operator diff — Fix flow visualization (not full IDE editor).
 */

import type { DevProjectIssue } from "@/lib/hub/dev/dev-project-state";
import type { CapabilityAction } from "@/lib/hub/capability/types";

export type OperatorDiffLineKind = "add" | "remove" | "context";

export type OperatorDiffLine = {
  readonly kind: OperatorDiffLineKind;
  readonly text: string;
};

export type OperatorDiff = {
  readonly filePath: string;
  readonly capabilityId: string;
  readonly summaryKo: readonly string[];
  readonly lines: readonly OperatorDiffLine[];
};

function capabilityFilePath(capabilityId: string): string {
  const parts = capabilityId.split(".");
  if (parts.length >= 2) {
    return `src/capabilities/${parts[0]}/${parts.slice(1).join("/")}.ts`;
  }
  return `src/capabilities/${capabilityId.replace(/\./g, "/")}.ts`;
}

function paymentCommitDiff(): OperatorDiff {
  return {
    filePath: "src/capabilities/payment/commit.ts",
    capabilityId: "payment.commit",
    summaryKo: [
      "결제 금액/통화 검증 로직 강화",
      "에러 메시지 명확화",
      "테스트 통과 확인",
    ],
    lines: [
      { kind: "context", text: "export async function commitPayment(input: CommitInput) {" },
      { kind: "context", text: "  const { amount, currency, bookingId } = input;" },
      { kind: "remove", text: "  if (!bookingId) throw new Error('missing booking');" },
      { kind: "add", text: "  if (!bookingId) throw new ValidationError('bookingId required');" },
      { kind: "add", text: "  if (amount <= 0) throw new ValidationError('amount must be > 0');" },
      { kind: "add", text: "  if (!['KRW','USD','JPY'].includes(currency)) {" },
      { kind: "add", text: "    throw new ValidationError('unsupported currency');" },
      { kind: "add", text: "  }" },
      { kind: "context", text: "  return await gateway.commit({ amount, currency, bookingId });" },
      { kind: "context", text: "}" },
    ],
  };
}

function schemaFixDiff(capabilityId: string): OperatorDiff {
  const schemaName = capabilityId.replace(/\./g, "_");
  return {
    filePath: `src/schemas/${schemaName}.schema.ts`,
    capabilityId,
    summaryKo: ["output schema를 API response에서 재생성", "adapter 필드 매핑 수정"],
    lines: [
      { kind: "context", text: `export const ${schemaName}Output = {` },
      { kind: "remove", text: "  type: 'object'," },
      { kind: "remove", text: "  properties: {}," },
      { kind: "add", text: "  type: 'object'," },
      { kind: "add", text: `  $id: '${capabilityId}.response.v1',` },
      { kind: "add", text: "  properties: { status: { type: 'string' }, result: { type: 'object' } }," },
      { kind: "context", text: "};" },
    ],
  };
}

function approvalPolicyDiff(capabilityId: string): OperatorDiff {
  return {
    filePath: capabilityFilePath(capabilityId),
    capabilityId,
    summaryKo: ["approvalRequired 정책 추가", "Agent 실행 전 사용자 승인 게이트"],
    lines: [
      { kind: "context", text: "export const manifest = {" },
      { kind: "add", text: "  approvalRequired: true," },
      { kind: "add", text: "  userApprovalGate: 'field_commit'," },
      { kind: "context", text: "};" },
    ],
  };
}

export function buildOperatorDiffForIssue(
  issue: DevProjectIssue,
  actions: readonly CapabilityAction[],
): OperatorDiff {
  const capId = issue.capabilityId ?? issue.title;

  if (capId.includes("payment.commit") || issue.id.includes("auth")) {
    return paymentCommitDiff();
  }
  if (issue.id.startsWith("issue-schema")) {
    return schemaFixDiff(capId);
  }
  if (issue.id.startsWith("issue-approval")) {
    return approvalPolicyDiff(capId);
  }

  const action = actions.find((a) => a.name === capId);
  if (action?.name.includes("payment")) return paymentCommitDiff();
  if (action?.name.includes("confirm")) return approvalPolicyDiff(capId);

  return {
    filePath: capabilityFilePath(capId),
    capabilityId: capId,
    summaryKo: [issue.detail, "adapter 및 schema 동기화"],
    lines: [
      { kind: "context", text: `// ${capId}` },
      { kind: "add", text: "// Operator fix applied" },
      { kind: "add", text: `approvalRequired: ${action?.approvalRequired ?? true},` },
    ],
  };
}
