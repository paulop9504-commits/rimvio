/**
 * Final Report — internal result → human-readable. Never dump raw tool JSON.
 */

import type {
  AgentFinalReport,
  AgentTurn,
  AgentTurnInspection,
  AgentTurnNextAction,
  AgentTurnUnderstand,
  AgentTurnVerification,
} from "@/lib/agent-os/agent-turn/types";

function headlineFor(input: {
  readonly understand: AgentTurnUnderstand | null;
  readonly status: AgentFinalReport["status"];
  readonly verified: boolean;
}): string {
  const domain = input.understand?.domain;
  if (input.status === "paused") return "작업을 잠시 멈췄어요.";
  if (input.status === "waiting") return "다음 단계는 확인이 필요해요.";
  if (input.status === "failed") return "이번에는 끝까지 마치지 못했어요.";
  if (input.understand?.intent === "inspect") return "현재 상태를 확인했습니다.";
  if (input.understand?.intent === "test") {
    return input.verified ? "테스트를 실행했고 통과했습니다. ✓" : "테스트를 실행했습니다. 일부 확인이 더 필요해요.";
  }
  if (input.understand?.intent === "connect") {
    return input.verified ? "연결을 확인했습니다. ✓" : "연결을 준비했습니다.";
  }
  if (domain === "delivery_marketplace") {
    return input.verified
      ? "배달 주문 시스템을 완성했습니다. ✓"
      : "배달 플랫폼 기본 구성을 진행했습니다.";
  }
  if (input.understand?.intent === "create") {
    return input.verified ? "요청하신 기능을 구성하고 확인했습니다. ✓" : "기본 구성을 진행했습니다.";
  }
  if (input.understand?.intent === "modify") {
    return input.verified ? "요청하신 변경을 적용하고 확인했습니다. ✓" : "변경을 적용했습니다.";
  }
  return input.verified ? "작업을 마치고 확인했습니다. ✓" : "작업을 진행했습니다.";
}

function completedFrom(turn: AgentTurn, after: AgentTurnInspection | null): string[] {
  const fromPlan = turn.steps.filter((s) => s.status === "done").map((s) => s.label);
  if (fromPlan.length > 0) return fromPlan;
  const fromActions = turn.actions
    .filter((a) => a.status === "success")
    .map((a) => a.capability ?? a.tool);
  if (fromActions.length > 0) return [...new Set(fromActions)];
  if (after?.capabilities.length) return after.capabilities.slice(0, 8);
  return turn.planLabels.slice(0, 8);
}

function nextActionsFor(input: {
  readonly understand: AgentTurnUnderstand | null;
  readonly after: AgentTurnInspection | null;
  readonly status: AgentFinalReport["status"];
}): AgentTurnNextAction[] {
  if (input.status === "paused" || input.status === "waiting") {
    return [{ id: "resume", labelKo: "이어서 진행" }];
  }
  const out: AgentTurnNextAction[] = [];
  const caps = input.after?.capabilities.join(" ").toLowerCase() ?? "";
  const stripe = input.after?.connections.stripe ?? false;
  if (input.understand?.domain === "delivery_marketplace" || /order|주문/.test(caps)) {
    if (!stripe && !/payment|결제/.test(caps)) {
      out.push({ id: "connect_payment", labelKo: "결제 연결" });
    }
    out.push({ id: "run_tests", labelKo: "전체 테스트" });
    out.push({ id: "open_preview", labelKo: "서비스 열기" });
    return out.slice(0, 3);
  }
  if (input.understand?.intent === "inspect") {
    out.push({ id: "run_tests", labelKo: "테스트하기" });
    out.push({ id: "open_preview", labelKo: "결과 보기" });
    return out;
  }
  if (input.understand?.intent === "test") {
    out.push({ id: "open_preview", labelKo: "서비스 열기" });
    return out;
  }
  out.push({ id: "run_tests", labelKo: "테스트하기" });
  out.push({ id: "open_preview", labelKo: "결과 보기" });
  return out.slice(0, 3);
}

export function generateFinalReport(input: {
  readonly turn: AgentTurn;
  readonly understand: AgentTurnUnderstand | null;
  readonly after: AgentTurnInspection | null;
  readonly verification: AgentTurnVerification | null;
  readonly status: AgentFinalReport["status"];
}): AgentFinalReport {
  const verified = Boolean(input.verification?.passed) && input.status === "success";
  const verificationRows =
    input.verification?.checks.map((c) => ({
      labelKo: c.labelKo,
      passed: c.passed,
    })) ?? [];

  const cautions: string[] = [];
  if (input.verification?.browserTest === "unavailable") {
    cautions.push("브라우저 전체 테스트 환경이 없어 화면 흐름은 실행하지 않았습니다.");
  }
  if (input.after && !input.after.connections.stripe) {
    if (input.understand?.domain === "delivery_marketplace" || input.understand?.intent === "create") {
      cautions.push("실제 결제 연동은 아직 연결하지 않았습니다.");
    }
  }
  if (input.verification && !input.verification.passed) {
    cautions.push(...input.verification.failedReasons.map((r) => `${r}을(를) 확인하지 못했습니다.`));
  }
  if (input.status === "failed") {
    const last = [...input.turn.actions].reverse().find((a) => a.status === "failed");
    if (last) {
      cautions.push(`막힌 지점: ${last.tool}`);
    }
  }

  const changed = [
    ...new Set([
      ...(input.after?.capabilities ?? []),
      ...input.turn.actions.filter((a) => a.status === "success").map((a) => a.tool),
    ]),
  ].slice(0, 10);

  return {
    headlineKo: headlineFor({ understand: input.understand, status: input.status, verified }),
    completed: completedFrom(input.turn, input.after),
    verification: verificationRows,
    changed,
    cautions,
    nextActions: nextActionsFor({
      understand: input.understand,
      after: input.after,
      status: input.status,
    }),
    verified,
    status: input.status,
  };
}

export function formatFinalReportKo(report: AgentFinalReport): string {
  const lines = [report.headlineKo];
  if (report.completed.length) {
    lines.push("", "완료", ...report.completed.map((c) => `· ${c}`));
  }
  if (report.verification.length) {
    lines.push(
      "",
      "검증",
      ...report.verification.map((v) => `${v.passed ? "✓" : "○"} ${v.labelKo}`),
    );
  }
  if (report.cautions.length) {
    lines.push("", "주의", ...report.cautions.map((c) => `· ${c}`));
  }
  if (report.nextActions.length) {
    lines.push("", "다음", report.nextActions.map((a) => a.labelKo).join(" · "));
  }
  return lines.join("\n");
}
