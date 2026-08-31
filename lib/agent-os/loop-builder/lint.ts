/**
 * Loop Linter — block publish of empty / infinite / unverified loops.
 */

import { isLoopExecutingNode } from "@/lib/agent-os/loop-builder/nodes";
import { validateCustomBlockCode } from "@/lib/agent-os/loop-builder/custom-block";
import type { LoopDefinition, LoopLintIssue, LoopLintResult } from "@/lib/agent-os/loop-builder/types";

export function lintLoopDefinition(loop: LoopDefinition): LoopLintResult {
  const issues: LoopLintIssue[] = [];
  const kinds = new Set(loop.nodes.map((n) => n.kind));
  const ids = new Set(loop.nodes.map((n) => n.id));

  if (loop.nodes.length === 0) {
    issues.push({ severity: "error", code: "empty", messageKo: "Loop에 블록이 없습니다." });
  }

  if (!kinds.has("TRIGGER") && !kinds.has("UNDERSTAND")) {
    issues.push({
      severity: "warning",
      code: "no_trigger",
      messageKo: "시작 블록(Trigger 또는 Understand)이 없습니다.",
    });
  }

  const hasExecute = loop.nodes.some((n) => isLoopExecutingNode(n));
  if (!hasExecute) {
    issues.push({
      severity: "error",
      code: "no_act",
      messageKo: "이 Loop에는 실제 실행 단계가 없습니다.",
    });
  }

  if (hasExecute && !kinds.has("VERIFY") && !kinds.has("OBSERVE")) {
    issues.push({
      severity: "error",
      code: "no_verify",
      messageKo: "실행 결과를 확인하는 Verify 단계가 없습니다.",
    });
  }

  const retryNodes = loop.nodes.filter((n) => n.kind === "RETRY");
  for (const node of retryNodes) {
    const max = node.config.maxAttempts ?? 0;
    if (max < 1) {
      issues.push({
        severity: "error",
        code: "infinite_retry",
        messageKo: "무한 반복 가능성이 있습니다. 최대 재시도 횟수를 설정하세요.",
        nodeId: node.id,
      });
    }
  }

  for (const node of loop.nodes) {
    if (node.kind === "CUSTOM") {
      const v = validateCustomBlockCode(node.config.customCode ?? "");
      if (!v.ok) {
        issues.push({
          severity: "error",
          code: "invalid_custom_code",
          messageKo: v.messageKo ?? "커스텀 블록 코드를 확인하세요.",
          nodeId: node.id,
        });
      }
    }
  }

  const verifyCount = loop.nodes.filter((n) => n.kind === "VERIFY").length;
  if (verifyCount >= 3 && !hasExecute) {
    issues.push({
      severity: "warning",
      code: "verify_only",
      messageKo: "Verify만 반복되고 있습니다. 실행 단계를 추가하세요.",
    });
  }

  for (const edge of loop.edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to)) {
      issues.push({
        severity: "error",
        code: "dangling_edge",
        messageKo: "연결이 없는 블록을 가리킵니다.",
      });
    }
  }

  if (loop.nodes.length > 1) {
    const connected = new Set<string>();
    for (const e of loop.edges) {
      connected.add(e.from);
      connected.add(e.to);
    }
    for (const n of loop.nodes) {
      if (!connected.has(n.id) && n.id !== loop.entryId) {
        issues.push({
          severity: "warning",
          code: "orphan",
          messageKo: `${n.label} 블록이 연결되지 않았습니다.`,
          nodeId: n.id,
        });
      }
    }
  }

  const publishBlocked = issues.some((i) => i.severity === "error");
  const checks = [
    { ok: !issues.some((i) => i.code === "dangling_edge"), label: "No missing dependency" },
    { ok: !issues.some((i) => i.code === "infinite_retry"), label: "No infinite loop" },
    {
      ok: retryNodes.length === 0 || retryNodes.every((n) => (n.config.maxAttempts ?? 0) >= 1),
      label: "Retry limit configured",
    },
    { ok: kinds.has("VERIFY") || kinds.has("OBSERVE"), label: "Verification exists" },
    { ok: hasExecute, label: "Required capabilities available" },
  ];
  return { ok: !publishBlocked, publishBlocked, issues, checks };
}
