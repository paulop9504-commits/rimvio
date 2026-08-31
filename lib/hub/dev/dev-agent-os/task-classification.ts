/**
 * Dev Agent task classification — CREATE/MODIFY/DEBUG/… before execution.
 */

import { classifyIntent } from "@/lib/agent/conversation/classify-intent";
import type { UserIntent } from "@/lib/agent/conversation/intent-types";
import type { DevTaskKind } from "@/lib/hub/dev/dev-agent-os/types";

export type ClassifiedDevTask = {
  readonly taskKind: DevTaskKind;
  readonly userIntent: UserIntent;
  readonly confidence: "high" | "medium" | "low";
  readonly reason: string;
};

const DEBUG_PATTERNS = [
  /안\s*돼/,
  /안\s*됨/,
  /에러/,
  /error/i,
  /bug/i,
  /broken/i,
  /doesn'?t\s*work/i,
  /실패/,
  /고장/,
  /crash/i,
  /주문이\s*안/,
  /결제\s*안/,
  /작동\s*안/,
  /왜\s*.*\s*안/,
];

const PLAN_PATTERNS = [
  /어떻게\s*만들/,
  /어떤\s*구조/,
  /설계\s*해\s*줘/,
  /plan\s/i,
  /how\s*should\s*i\s*build/i,
  /architecture/i,
  /구조\s*추천/,
  /만들면\s*좋/,
];

const REMOVE_PATTERNS = [
  /삭제/,
  /제거/,
  /빼\s*줘/,
  /빼$/,
  /remove/i,
  /delete/i,
  /없애/,
  /지워/,
];

const DEPLOY_PATTERNS = [
  /배포/,
  /deploy/i,
  /publish/i,
  /출시/,
  /production/i,
  /프로덕션/,
  /라이브\s*배포/,
];

const CONNECT_PATTERNS = [
  /연결/,
  /connect/i,
  /oauth/i,
  /api\s*붙/,
  /integration/i,
  /stripe/i,
  /github/i,
  /vercel/i,
  /supabase/i,
];

const TEST_PATTERNS = [
  /테스트/,
  /test\s/i,
  /run\s*test/i,
  /sandbox/i,
  /lint/i,
  /e2e/i,
  /검증\s*해/,
];

const CREATE_PATTERNS = [
  /만들/,
  /생성/,
  /create/i,
  /build\s/i,
  /새\s*플랫폼/,
  /platform\s*만들/i,
];

function normalize(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/** Map DevTaskKind → wire UserIntent (conversation gate SSOT). */
export function devTaskToUserIntent(taskKind: DevTaskKind): UserIntent {
  switch (taskKind) {
    case "create":
      return "create";
    case "modify":
    case "remove":
      return "modify";
    case "debug":
    case "test":
      return "test";
    case "connect":
      return "connect";
    case "deploy":
      return "publish";
    case "plan":
      return "question";
    default: {
      const _exhaustive: never = taskKind;
      return _exhaustive;
    }
  }
}

/**
 * Classify utterance into Dev Agent task kind.
 * Runs before Platform Goal compilation — steers INSPECT/PLAN/DEBUG behavior.
 */
export function classifyDevTask(utterance: string): ClassifiedDevTask {
  const text = normalize(utterance);
  const base = classifyIntent(text);

  if (PLAN_PATTERNS.some((p) => p.test(text)) && !CREATE_PATTERNS.some((p) => p.test(text))) {
    return {
      taskKind: "plan",
      userIntent: "question",
      confidence: "high",
      reason: "planning_question",
    };
  }

  if (DEBUG_PATTERNS.some((p) => p.test(text))) {
    return {
      taskKind: "debug",
      userIntent: "test",
      confidence: "high",
      reason: "debug_failure_report",
    };
  }

  if (REMOVE_PATTERNS.some((p) => p.test(text))) {
    return {
      taskKind: "remove",
      userIntent: "modify",
      confidence: "high",
      reason: "remove_feature",
    };
  }

  if (DEPLOY_PATTERNS.some((p) => p.test(text))) {
    return {
      taskKind: "deploy",
      userIntent: "publish",
      confidence: "high",
      reason: "deploy_request",
    };
  }

  if (CONNECT_PATTERNS.some((p) => p.test(text)) && base.intent !== "create") {
    return {
      taskKind: "connect",
      userIntent: "connect",
      confidence: "high",
      reason: "connect_integration",
    };
  }

  if (TEST_PATTERNS.some((p) => p.test(text)) && base.intent !== "create") {
    return {
      taskKind: "test",
      userIntent: "test",
      confidence: "high",
      reason: "test_request",
    };
  }

  if (CREATE_PATTERNS.some((p) => p.test(text)) && base.intent === "create") {
    return {
      taskKind: "create",
      userIntent: "create",
      confidence: base.confidence,
      reason: base.reason,
    };
  }

  const taskKindFromIntent: DevTaskKind =
    base.intent === "create"
      ? "create"
      : base.intent === "modify"
        ? "modify"
        : base.intent === "inspect"
          ? "plan"
          : base.intent === "test"
            ? "test"
            : base.intent === "connect"
              ? "connect"
              : base.intent === "publish"
                ? "deploy"
                : "plan";

  return {
    taskKind: taskKindFromIntent,
    userIntent: base.intent === "question" || base.intent === "chat" ? base.intent : devTaskToUserIntent(taskKindFromIntent),
    confidence: base.confidence,
    reason: base.reason,
  };
}
