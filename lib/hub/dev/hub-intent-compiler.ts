/**
 * Hub Creator Intent Compiler — natural language → platform mutations + execution plan.
 * Creator does not need dev vocabulary; Agent maps intent to Capability/Schema/Workflow/Permission.
 */

import type { HubAgentPlanStep } from "@/lib/hub/dev/hub-agent-loop";
import type { HubWorkspaceToolId } from "@/lib/hub/dev/hub-workspace-tools";
import type { HubWorkspaceFullState } from "@/lib/hub/dev/hub-workspace-observe";
import { isConnectUtterance } from "@/lib/hub/dev/hub-connect-provider";
import { wantsLoopBuilderUtterance, wantsLoopTestUtterance } from "@/lib/hub/dev/hub-loop-agent";

export type HubIntentKind =
  | "loop_builder"
  | "user_approval_gate"
  | "payment_flow"
  | "full_journey"
  | "capability_edit"
  | "sort_or_ui"
  | "publish"
  | "test_only"
  | "general";

export type HubIntentMutation = {
  readonly axis: "capability" | "schema" | "workflow" | "permission" | "commerce";
  readonly label: string;
  readonly capability?: string;
};

export type HubCreatorIntent = {
  readonly kind: HubIntentKind;
  readonly summaryKo: string;
  readonly mutations: readonly HubIntentMutation[];
  readonly steps: readonly HubAgentPlanStep[];
};

function step(
  id: string,
  label: string,
  toolId: HubWorkspaceToolId,
  args?: Record<string, unknown>,
): HubAgentPlanStep {
  return { id, label, toolId, args };
}

function wantsUserApproval(utterance: string): boolean {
  return /확인|승인|approve|한\s*번\s*더|사용자.*확인|컨펌/i.test(utterance);
}

function wantsPayment(utterance: string): boolean {
  return /stripe|결제|payment|commerce|카드/i.test(utterance);
}

function wantsFullJourney(utterance: string): boolean {
  return /회원|가입|auth|부터.*까지|전체|end-to-end|signup.*payment/i.test(utterance);
}

function wantsPublish(utterance: string): boolean {
  return /publish|배포|출시|production/i.test(utterance);
}

function wantsTest(utterance: string): boolean {
  return /test|테스트|검증/i.test(utterance);
}

/** Compile creator utterance into mutations + tool steps. */
export function compileHubCreatorIntent(input: {
  readonly utterance: string;
  readonly state: HubWorkspaceFullState;
  readonly stripeConnected: boolean;
}): HubCreatorIntent | null {
  const text = input.utterance.trim();
  if (!text) return null;

  if (isConnectUtterance(text)) {
    return null;
  }

  if (wantsLoopBuilderUtterance(text)) {
    const steps = [
      step("loop_create", "Loop 생성", "loop.create", { utterance: text }),
      step("loop_lint", "Loop AI 검증", "loop.lint"),
    ];
    if (/test|테스트|실험|돌려|run/i.test(text)) {
      steps.push(step("loop_test", "Loop 테스트", "loop.test"));
    }
    return {
      kind: "loop_builder",
      summaryKo: "Agent Loop를 생성하고 Loop Builder에 반영합니다.",
      mutations: [{ axis: "workflow", label: "Agent Loop Definition" }],
      steps,
    };
  }

  if (wantsLoopTestUtterance(text)) {
    return {
      kind: "loop_builder",
      summaryKo: "저장된 Loop를 테스트합니다.",
      mutations: [],
      steps: [
        step("loop_read", "Loop 확인", "loop.read"),
        step("loop_test", "Loop 테스트", "loop.test"),
      ],
    };
  }

  const caps = input.state.capabilities;
  const hasPaymentCommit = caps.includes("payment.commit");
  const hasPaymentPrepare = caps.includes("payment.prepare");

  if (wantsUserApproval(text) && (wantsPayment(text) || hasPaymentCommit || /commit|결제/i.test(text))) {
    const mutations: HubIntentMutation[] = [
      { axis: "capability", label: "payment.commit approvalRequired", capability: "payment.commit" },
      { axis: "permission", label: "payment.commit approval policy" },
      { axis: "workflow", label: "user approval step before commit" },
    ];
    const steps: HubAgentPlanStep[] = [
      step("observe", "플랫폼 상태 확인", "workspace.inspect"),
      step("perm_read", "권한 확인", "permission.read"),
      step("cap_approval", "payment.commit 승인 정책", "capability.update", {
        intent: "approval_gate",
      }),
      step("schema_commit", "approvalToken 스키마", "schema.update", {
        capability: "payment.commit",
        fixApprovalToken: true,
      }),
      step("workflow", "승인 워크플로우", "workflow.update", {
        description: "payment.prepare → user approval → payment.commit",
      }),
      step("test", "테스트 실행", "test.run"),
    ];
    return {
      kind: "user_approval_gate",
      summaryKo: "결제 전 사용자 확인 단계를 추가합니다.",
      mutations,
      steps,
    };
  }

  if (wantsFullJourney(text)) {
    const phases = [
      { id: "auth", label: "Auth capability", cap: "auth.signup" },
      { id: "user", label: "User data schema", cap: "user.profile" },
      { id: "search", label: "Hotel search", cap: "hotel.search" },
      { id: "booking", label: "Booking confirm", cap: "booking.confirm" },
      { id: "payment", label: "Payment flow", cap: "payment.commit" },
      { id: "perm", label: "Permissions", cap: null },
      { id: "workflow", label: "End-to-end workflow", cap: null },
      { id: "test", label: "Sandbox tests", cap: null },
      { id: "preview", label: "Preview", cap: null },
    ];
    const mutations: HubIntentMutation[] = phases
      .filter((p) => p.cap)
      .map((p) => ({ axis: "capability" as const, label: p.label, capability: p.cap! }));

    const steps: HubAgentPlanStep[] = [step("observe", "플랫폼 상태 확인", "workspace.inspect")];
    if (!caps.includes("auth.signup")) {
      steps.push(step("auth", "Auth capability", "file.patch", { journey: "auth" }));
    }
    if (!caps.includes("hotel.search")) {
      steps.push(step("search", "Hotel search", "file.patch", { journey: "hotel_search" }));
    }
    if (!caps.includes("booking.confirm")) {
      steps.push(step("booking", "Booking confirm", "file.patch", { journey: "booking" }));
    }
    if (!input.stripeConnected) {
      steps.push(step("ask_stripe", "Stripe 연결", "connection.connect", { provider: "stripe" }));
    }
    if (!hasPaymentPrepare || !hasPaymentCommit) {
      steps.push(step("payment", "Payment capabilities", "file.patch", { payment: true }));
    }
    steps.push(step("workflow", "전체 워크플로우", "workflow.create", {
      description: "signup → search → booking → payment.prepare → approval → payment.commit",
    }));
    steps.push(step("perm", "권한 정리", "permission.read"));
    steps.push(step("test", "테스트 실행", "test.run"));
    steps.push(step("preview", "미리보기", "preview.run"));

    return {
      kind: "full_journey",
      summaryKo: "회원가입부터 결제까지 단계별로 구성합니다.",
      mutations,
      steps,
    };
  }

  if (wantsPayment(text)) {
    const mutations: HubIntentMutation[] = [];
    if (!hasPaymentPrepare) mutations.push({ axis: "capability", label: "payment.prepare", capability: "payment.prepare" });
    if (!hasPaymentCommit) mutations.push({ axis: "capability", label: "payment.commit", capability: "payment.commit" });
    mutations.push({ axis: "commerce", label: "Stripe integration" });
    mutations.push({ axis: "workflow", label: "prepare → approval → commit" });

    const steps: HubAgentPlanStep[] = [
      step("observe", "플랫폼 상태 확인", "workspace.inspect"),
      step("connections", "연결 확인", "connection.list"),
    ];
    if (!input.stripeConnected) {
      steps.push(step("ask_stripe", "Stripe 연결", "connection.connect", { provider: "stripe" }));
    }
    if (!hasPaymentPrepare || !hasPaymentCommit) {
      steps.push(step("payment", "Payment capabilities", "file.patch", { payment: true }));
    }
    steps.push(step("workflow", "결제 워크플로우", "workflow.create", {
      description: "payment.prepare → user approval → payment.commit",
    }));
    steps.push(step("test", "테스트 실행", "test.run"));
    steps.push(step("verify", "Publish 준비", "deploy.prepare"));

    return {
      kind: "payment_flow",
      summaryKo: "Stripe 결제 capability와 워크플로우를 구성합니다.",
      mutations,
      steps,
    };
  }

  if (wantsPublish(text)) {
    return {
      kind: "publish",
      summaryKo: "Publish 전 검증을 실행합니다.",
      mutations: [],
      steps: [
        step("observe", "플랫폼 상태 확인", "workspace.inspect"),
        step("test", "테스트 실행", "test.run"),
        step("deploy", "Publish 준비", "deploy.prepare", { publish: true }),
      ],
    };
  }

  if (wantsTest(text)) {
    return {
      kind: "test_only",
      summaryKo: "Sandbox 테스트를 실행합니다.",
      mutations: [],
      steps: [
        step("observe", "플랫폼 상태 확인", "workspace.inspect"),
        step("test", "테스트 실행", "test.run"),
      ],
    };
  }

  return null;
}
