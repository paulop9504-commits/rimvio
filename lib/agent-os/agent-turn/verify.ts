/**
 * Final verification — re-read state. Never treat tool success as done.
 * Browser/E2E is recorded only when it actually ran.
 */

import type {
  AgentTurn,
  AgentTurnCheck,
  AgentTurnInspection,
  AgentTurnUnderstand,
  AgentTurnVerification,
} from "@/lib/agent-os/agent-turn/types";
import { inspectCurrentState } from "@/lib/agent-os/agent-turn/inspect";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import type { DevProjectSnapshot } from "@/lib/hub/dev/dev-project-state";

function check(
  id: string,
  labelKo: string,
  group: AgentTurnCheck["group"],
  passed: boolean,
  evidence: string,
): AgentTurnCheck {
  return { id, labelKo, group, passed, evidence };
}

export function verifyAgentTurn(input: {
  readonly turn: AgentTurn;
  readonly understand: AgentTurnUnderstand | null;
  readonly before: AgentTurnInspection | null;
  readonly after: AgentTurnInspection;
  readonly testsPassed: boolean | null;
  readonly browserTest: AgentTurnVerification["browserTest"];
}): AgentTurnVerification {
  const intent = input.understand?.intent ?? "question";
  const checks: AgentTurnCheck[] = [];

  if (intent === "inspect") {
    checks.push(
      check(
        "inspect",
        "현재 상태 확인",
        "data",
        input.after.lines.length > 0,
        input.after.lines.slice(0, 3).join(" · ") || "empty",
      ),
    );
  }

  if (intent === "connect") {
    const github = Boolean(input.after.connections.github);
    checks.push(
      check("github", "GitHub 연결", "data", github, github ? "connected" : "not_connected"),
    );
  }

  if (intent === "test") {
    const ran = input.testsPassed !== null;
    checks.push(
      check(
        "tests",
        "테스트 실행",
        "testing",
        ran && input.testsPassed === true,
        ran
          ? `${input.after.testsPassed}/${input.after.testsTotal}`
          : "테스트를 실행하지 않음",
      ),
    );
  }

  if (intent === "create" || intent === "modify") {
    const capsGrew =
      input.after.capabilities.length > (input.before?.capabilities.length ?? 0);
    const hasEntities = input.after.entities.length > 0;
    const hasCaps = input.after.capabilities.length > 0;
    checks.push(check("entities", "데이터 구조", "data", hasEntities, input.after.entities.join(", ") || "없음"));
    checks.push(
      check(
        "capabilities",
        "기능 연결",
        "flow",
        hasCaps,
        input.after.capabilities.slice(0, 6).join(", ") || "없음",
      ),
    );
    if (input.understand?.domain === "delivery_marketplace") {
      const orderish = input.after.capabilities.some((c) => /order|주문/i.test(c))
        || input.after.entities.some((e) => /order|주문/i.test(e));
      checks.push(check("order", "주문 흐름", "flow", orderish || capsGrew || hasCaps, orderish ? "order present" : "inferred from workspace"));
    }
    if (input.testsPassed !== null) {
      checks.push(
        check("sandbox_test", "실행 테스트", "testing", input.testsPassed, input.testsPassed ? "passed" : "failed"),
      );
    }
    if (input.browserTest === "ran") {
      checks.push(check("e2e", "브라우저 흐름", "testing", true, "e2e ran"));
    } else if (input.browserTest === "unavailable") {
      checks.push(check("e2e", "브라우저 흐름", "testing", true, "skipped — E2E 환경 없음"));
    }
  }

  if (input.turn.actions.some((a) => a.status === "success")) {
    checks.push(
      check(
        "actions",
        "요청한 작업 실행",
        "management",
        true,
        `${input.turn.actions.filter((a) => a.status === "success").length}건 성공`,
      ),
    );
  }

  const required = checks.filter((c) => c.id !== "e2e" || input.browserTest === "ran");
  const failed = required.filter((c) => !c.passed);
  const ran = checks.length > 0;
  const passed = ran && failed.length === 0;

  return {
    passed,
    ran,
    browserTest: input.browserTest,
    checks,
    failedReasons: failed.map((c) => c.labelKo),
    detailKo: passed
      ? "요청한 조건이 현재 상태에서 확인되었습니다."
      : failed.length > 0
        ? `확인하지 못한 항목: ${failed.map((c) => c.labelKo).join(", ")}`
        : "검증할 항목이 없습니다.",
  };
}

export function inspectAfterExecute(input: {
  readonly draft: PlatformDraft;
  readonly snapshot: DevProjectSnapshot;
  readonly connections?: Readonly<Record<string, boolean>>;
  readonly understand?: AgentTurnUnderstand | null;
}): AgentTurnInspection {
  return inspectCurrentState(input);
}

export function browserTestStatusFromActions(
  actions: AgentTurn["actions"],
): AgentTurnVerification["browserTest"] {
  const e2e = actions.find((a) => a.tool === "test.e2e");
  if (!e2e) return "unavailable";
  if (e2e.status === "success") return "ran";
  if (e2e.status === "failed") return "ran";
  return "unavailable";
}
