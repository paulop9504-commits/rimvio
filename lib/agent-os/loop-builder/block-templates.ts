/**
 * Rimvio preset block templates — creators pick, then edit code in Inspector.
 */

import type { LoopNode, LoopNodeKind } from "@/lib/agent-os/loop-builder/types";

export type LoopBlockTemplateCategory =
  | "core"
  | "order"
  | "payment"
  | "inventory"
  | "notify"
  | "auth"
  | "verify"
  | "integration";

export type LoopBlockTemplate = {
  readonly id: string;
  readonly category: LoopBlockTemplateCategory;
  readonly label: string;
  readonly hintKo: string;
  readonly kind: LoopNodeKind;
  readonly defaultLabel: string;
  readonly config: LoopNode["config"];
};

export const LOOP_BLOCK_TEMPLATE_CATEGORIES: readonly {
  readonly id: LoopBlockTemplateCategory;
  readonly label: string;
}[] = [
  { id: "core", label: "Core" },
  { id: "order", label: "Order" },
  { id: "payment", label: "Payment" },
  { id: "inventory", label: "Inventory" },
  { id: "notify", label: "Notify" },
  { id: "auth", label: "Auth" },
  { id: "verify", label: "Verify" },
  { id: "integration", label: "Integration" },
];

export const LOOP_BLOCK_TEMPLATES: readonly LoopBlockTemplate[] = [
  {
    id: "trigger.user_request",
    category: "core",
    label: "User Request",
    hintKo: "사용자 요청으로 시작",
    kind: "TRIGGER",
    defaultLabel: "User Request",
    config: { target: "user.request", description: "Inbound user intent" },
  },
  {
    id: "understand.intent",
    category: "core",
    label: "Understand Intent",
    hintKo: "요청 구조화",
    kind: "UNDERSTAND",
    defaultLabel: "Understand Intent",
    config: {
      customCode: `understand({ source: "utterance" })\n  .extract(["domain", "entity", "outcome"])\n  .bind("intent")`,
    },
  },
  {
    id: "inspect.workspace",
    category: "core",
    label: "Inspect State",
    hintKo: "현재 Workspace 상태",
    kind: "INSPECT",
    defaultLabel: "Inspect State",
    config: {
      target: "workspace",
      customCode: `inspect("workspace")\n  .read(["capabilities", "connections", "draft"])\n  .snapshot("state")`,
    },
  },
  {
    id: "decide.next_action",
    category: "core",
    label: "Decide Next",
    hintKo: "다음 행동 선택",
    kind: "DECIDE",
    defaultLabel: "Decide Next Action",
    config: {
      customCode: `decide()\n  .from("state", "intent")\n  .pick("best_candidate")`,
    },
  },
  {
    id: "observe.result",
    category: "core",
    label: "Observe Result",
    hintKo: "실행 결과 관찰",
    kind: "OBSERVE",
    defaultLabel: "Observe Result",
    config: {
      customCode: `observe()\n  .watch("last_tool_result")\n  .emit("observation")`,
    },
  },
  {
    id: "condition.if",
    category: "core",
    label: "IF Branch",
    hintKo: "조건 분기",
    kind: "CONDITION",
    defaultLabel: "IF condition",
    config: {
      predicate: "state.ready === true",
      customCode: `if ({{ predicate }})\n  .yes("continue")\n  .no("ask_user")`,
    },
  },
  {
    id: "retry.standard",
    category: "core",
    label: "Retry ×2",
    hintKo: "재시도 (최대 2회)",
    kind: "RETRY",
    defaultLabel: "Retry ×2",
    config: { maxAttempts: 2, onFailure: "replan" },
  },
  {
    id: "replan.standard",
    category: "core",
    label: "Replan",
    hintKo: "계획 수정",
    kind: "REPLAN",
    defaultLabel: "Replan",
    config: {
      customCode: `replan()\n  .keep("completed_steps")\n  .insert("recovery")`,
    },
  },
  {
    id: "wait.short",
    category: "core",
    label: "Wait 2s",
    hintKo: "짧은 대기",
    kind: "WAIT",
    defaultLabel: "Wait",
    config: { customCode: `wait({ ms: 2000 })`, target: "2000" },
  },
  {
    id: "ask.user",
    category: "notify",
    label: "Ask User",
    hintKo: "사용자에게 묻기",
    kind: "ASK_USER",
    defaultLabel: "Ask User",
    config: {
      customCode: `ask_user({ prompt: "다음 중 선택해 주세요", options: ["continue", "cancel"] })`,
    },
  },
  {
    id: "approval.required",
    category: "auth",
    label: "Require Approval",
    hintKo: "승인 필요",
    kind: "APPROVAL",
    defaultLabel: "Require Approval",
    config: {
      customCode: `approval({ policy: "human_commit", risk: "high" })`,
    },
  },
  {
    id: "complete.done",
    category: "core",
    label: "Complete",
    hintKo: "완료",
    kind: "COMPLETE",
    defaultLabel: "Complete",
    config: {},
  },
  {
    id: "fail.stop",
    category: "core",
    label: "Fail",
    hintKo: "실패 종료",
    kind: "FAIL",
    defaultLabel: "Fail",
    config: { customCode: `fail({ reason: "unrecoverable" })` },
  },
  {
    id: "order.inspect",
    category: "order",
    label: "Inspect Order",
    hintKo: "주문 상태 확인",
    kind: "INSPECT",
    defaultLabel: "Inspect Order",
    config: {
      target: "order",
      customCode: `inspect("order")\n  .read(["status", "items", "customerId"])\n  .bind("order")`,
    },
  },
  {
    id: "order.create",
    category: "order",
    label: "Create Order",
    hintKo: "주문 생성",
    kind: "CAPABILITY",
    defaultLabel: "Create Order",
    config: {
      capabilityId: "order.create",
      toolId: "capability.create",
      inputMap: { productId: "{{ order.productId }}", qty: "{{ order.qty }}" },
      outputVars: ["orderId", "status"],
      customCode: `capability("order.create")\n  .input({ productId: order.productId, qty: order.qty })\n  .output(["orderId", "status"])`,
    },
  },
  {
    id: "order.approve",
    category: "order",
    label: "Approve Order",
    hintKo: "주문 승인",
    kind: "ACT",
    defaultLabel: "Approve Order",
    config: {
      capabilityId: "order.update",
      toolId: "capability.update",
      target: "order",
      customCode: `act("order.update")\n  .patch({ status: "approved" })\n  .require(["orderId"])`,
    },
  },
  {
    id: "order.cancel",
    category: "order",
    label: "Cancel Order",
    hintKo: "주문 취소",
    kind: "ACT",
    defaultLabel: "Cancel Order",
    config: {
      capabilityId: "order.update",
      target: "order",
      customCode: `act("order.update")\n  .patch({ status: "cancelled" })`,
    },
  },
  {
    id: "inventory.check",
    category: "inventory",
    label: "Check Inventory",
    hintKo: "재고 확인",
    kind: "INSPECT",
    defaultLabel: "Check Inventory",
    config: {
      target: "inventory",
      predicate: "inventory_available",
      customCode: `inspect("inventory")\n  .read(["available", "sku", "warehouseId"])\n  .bind("stock")`,
    },
  },
  {
    id: "inventory.reserve",
    category: "inventory",
    label: "Reserve Stock",
    hintKo: "재고 예약",
    kind: "ACT",
    defaultLabel: "Reserve Stock",
    config: {
      capabilityId: "inventory.reserve",
      customCode: `act("inventory.reserve")\n  .input({ sku: stock.sku, qty: order.qty })\n  .output(["reservationId"])`,
    },
  },
  {
    id: "payment.create",
    category: "payment",
    label: "Payment",
    hintKo: "결제 실행",
    kind: "CAPABILITY",
    defaultLabel: "Payment",
    config: {
      capabilityId: "payment.create",
      toolId: "capability.create",
      target: "payment",
      inputMap: { amountKrw: "{{ order.totalKrw }}", orderId: "{{ order.id }}" },
      outputVars: ["paymentId", "status"],
      customCode: `capability("payment.create")\n  .input({ amountKrw: order.totalKrw, orderId: order.id })\n  .onFail("retry")`,
    },
  },
  {
    id: "payment.prepare",
    category: "payment",
    label: "Payment Prepare",
    hintKo: "결제 준비",
    kind: "CAPABILITY",
    defaultLabel: "Payment Prepare",
    config: {
      capabilityId: "payment.prepare",
      customCode: `capability("payment.prepare")\n  .input({ amountKrw: order.totalKrw })`,
    },
  },
  {
    id: "payment.verify",
    category: "verify",
    label: "Verify Payment",
    hintKo: "결제 검증",
    kind: "VERIFY",
    defaultLabel: "Verify Payment",
    config: {
      target: "payment",
      checks: ["payment_exists", "status_ok", "amount_matches"],
      onSuccess: "complete",
      onFailure: "retry",
      maxAttempts: 2,
      customCode: `verify("payment")\n  .check(["payment_exists", "status_ok", "amount_matches"])\n  .onFail("retry", 2)`,
    },
  },
  {
    id: "order.verify",
    category: "verify",
    label: "Verify Order",
    hintKo: "주문 검증",
    kind: "VERIFY",
    defaultLabel: "Verify Order",
    config: {
      target: "order",
      checks: ["order_exists", "status_ok", "persisted", "customer_visible"],
      onSuccess: "complete",
      onFailure: "replan",
      customCode: `verify("order")\n  .check(["order_exists", "status_ok", "persisted"])\n  .onFail("replan")`,
    },
  },
  {
    id: "verify.e2e",
    category: "verify",
    label: "Browser E2E",
    hintKo: "화면 E2E 검증",
    kind: "BROWSER",
    defaultLabel: "Browser E2E",
    config: {
      toolId: "test.e2e",
      customCode: `browser()\n  .e2e({ journey: "checkout" })\n  .onlyIf("test.e2e.ran")`,
    },
  },
  {
    id: "verify.sandbox",
    category: "verify",
    label: "Sandbox Test",
    hintKo: "샌드박스 테스트",
    kind: "TOOL",
    defaultLabel: "Sandbox Test",
    config: {
      toolId: "test.run",
      customCode: `tool("test.run")\n  .args({ scope: "sandbox" })`,
    },
  },
  {
    id: "notify.user",
    category: "notify",
    label: "Notify User",
    hintKo: "사용자 알림",
    kind: "ACT",
    defaultLabel: "Notify User",
    config: {
      customCode: `act("notify.send")\n  .channel(["push", "email"])\n  .template("order_update")`,
    },
  },
  {
    id: "auth.verify",
    category: "auth",
    label: "Verify User",
    hintKo: "사용자 인증",
    kind: "INSPECT",
    defaultLabel: "Verify User",
    config: {
      target: "user",
      customCode: `inspect("user")\n  .read(["id", "role", "verified"])\n  .require("verified")`,
    },
  },
  {
    id: "api.http",
    category: "integration",
    label: "HTTP API",
    hintKo: "외부 API 호출",
    kind: "API",
    defaultLabel: "HTTP API",
    config: {
      customCode: `api({ method: "POST", path: "/v1/resource" })\n  .headers({ "Content-Type": "application/json" })\n  .body({})`,
    },
  },
  {
    id: "database.patch",
    category: "integration",
    label: "Database Write",
    hintKo: "DB 저장",
    kind: "DATABASE",
    defaultLabel: "Database Write",
    config: {
      toolId: "resource.apply",
      customCode: `database("resource.apply")\n  .collection("orders")\n  .upsert({ id: order.id, status: order.status })`,
    },
  },
  {
    id: "workflow.run",
    category: "integration",
    label: "Run Workflow",
    hintKo: "워크플로 실행",
    kind: "WORKFLOW",
    defaultLabel: "Run Workflow",
    config: {
      customCode: `workflow("checkout")\n  .steps(["prepare", "commit"])\n  .awaitApproval(true)`,
    },
  },
  {
    id: "variable.bind",
    category: "core",
    label: "Bind Variable",
    hintKo: "변수 바인딩",
    kind: "VARIABLE",
    defaultLabel: "Bind Variable",
    config: {
      customCode: `variable("result")\n  .from("last_output")\n  .expose(["orderId"])`,
    },
  },
  {
    id: "context.read",
    category: "core",
    label: "Read Context",
    hintKo: "대화 맥락 읽기",
    kind: "CONTEXT",
    defaultLabel: "Read Context",
    config: {
      customCode: `context()\n  .read(["currentGoal", "lastTask", "constraints"])`,
    },
  },
  {
    id: "custom.blank",
    category: "integration",
    label: "Custom Code",
    hintKo: "직접 코드 작성",
    kind: "CUSTOM",
    defaultLabel: "Custom Block",
    config: {
      customCode: `// Custom block — edit freely\nact("your.capability")\n  .input({ key: "{{ variable }}" })\n  .verify(["result_ok"])`,
    },
  },
];

export function getLoopBlockTemplate(id: string): LoopBlockTemplate | null {
  return LOOP_BLOCK_TEMPLATES.find((t) => t.id === id) ?? null;
}

export function listLoopBlockTemplates(category?: LoopBlockTemplateCategory): readonly LoopBlockTemplate[] {
  if (!category) return LOOP_BLOCK_TEMPLATES;
  return LOOP_BLOCK_TEMPLATES.filter((t) => t.category === category);
}
