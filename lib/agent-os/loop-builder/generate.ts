/**
 * AI / Simple mode — NL → Loop Definition. Deterministic; no new runtime.
 */

import { createLoopNode } from "@/lib/agent-os/loop-builder/nodes";
import type { LoopDefinition, LoopEdge, LoopNode } from "@/lib/agent-os/loop-builder/types";

function edge(from: string, to: string, kind: LoopEdge["kind"] = "next"): LoopEdge {
  return { from, to, kind };
}

function retryMax(text: string): number {
  const m = text.match(/최대\s*(\d+)\s*번|retry\s*x?\s*(\d+)|(\d+)\s*번\s*재시/i);
  const n = Number(m?.[1] ?? m?.[2] ?? m?.[3] ?? 2);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 5) : 2;
}

export function generateLoopFromUtterance(utterance: string): LoopDefinition {
  const text = utterance.trim();
  const wantsInventory = /재고|inventory|stock/i.test(text);
  const wantsPayment = /결제|payment|pay/i.test(text);
  const wantsApprove = /승인|approve|접수/i.test(text);
  const wantsAsk = /알려|물어|ask/i.test(text);
  const wantsRetry = /재시|retry|실패/i.test(text);
  const maxAttempts = retryMax(text);

  const nodes: LoopNode[] = [
    createLoopNode("TRIGGER", "n_trigger", "User Request"),
    createLoopNode("UNDERSTAND", "n_understand", "Understand Order"),
  ];
  const edges: LoopEdge[] = [edge("n_trigger", "n_understand")];
  let prev = "n_understand";

  if (wantsInventory) {
    nodes.push(createLoopNode("INSPECT", "n_inspect", "Check Inventory", { target: "inventory" }));
    edges.push(edge(prev, "n_inspect"));
    nodes.push(
      createLoopNode("CONDITION", "n_if", "IF inventory available", {
        predicate: "inventory_available",
      }),
    );
    edges.push(edge("n_inspect", "n_if"));
    prev = "n_if";
  } else {
    nodes.push(createLoopNode("INSPECT", "n_inspect", "Inspect", { target: "order" }));
    edges.push(edge(prev, "n_inspect"));
    prev = "n_inspect";
  }

  if (wantsApprove) {
    nodes.push(createLoopNode("ACT", "n_approve", "Approve Order", { toolId: "capability.update" }));
    if (wantsInventory) {
      edges.push(edge("n_if", "n_approve", "yes"));
    } else {
      edges.push(edge(prev, "n_approve"));
    }
    prev = "n_approve";
  }

  if (wantsAsk) {
    nodes.push(createLoopNode("ASK_USER", "n_ask", "Ask User"));
    if (wantsInventory) {
      edges.push(edge("n_if", "n_ask", "no"));
    }
  }

  if (wantsPayment) {
    nodes.push(
      createLoopNode("CAPABILITY", "n_pay", "Payment", {
        capabilityId: "payment.create",
        toolId: "capability.create",
      }),
    );
    edges.push(edge(prev, "n_pay"));
    nodes.push(
      createLoopNode("VERIFY", "n_verify", "Verify Payment", {
        target: "payment",
        checks: ["payment_exists", "status_ok"],
        onSuccess: "complete",
        onFailure: wantsRetry ? "retry" : "replan",
        maxAttempts,
      }),
    );
    edges.push(edge("n_pay", "n_verify"));
    nodes.push(createLoopNode("COMPLETE", "n_done", "Complete"));
    edges.push(edge("n_verify", "n_done", "pass"));
    if (wantsRetry) {
      nodes.push(createLoopNode("RETRY", "n_retry", `Retry ×${maxAttempts}`, { maxAttempts }));
      nodes.push(createLoopNode("REPLAN", "n_replan", "Replan"));
      edges.push(edge("n_verify", "n_retry", "fail"));
      edges.push(edge("n_retry", "n_replan"));
      edges.push(edge("n_replan", "n_pay"));
    } else {
      nodes.push(createLoopNode("REPLAN", "n_replan", "Replan"));
      edges.push(edge("n_verify", "n_replan", "fail"));
    }
  } else {
    nodes.push(
      createLoopNode("VERIFY", "n_verify", "Verify Order", {
        target: "order",
        checks: ["order_exists", "status_ok", "persisted"],
        onSuccess: "complete",
        onFailure: "replan",
      }),
    );
    edges.push(edge(prev, "n_verify"));
    nodes.push(createLoopNode("COMPLETE", "n_done", "Complete"));
    nodes.push(createLoopNode("REPLAN", "n_replan", "Replan"));
    edges.push(edge("n_verify", "n_done", "pass"));
    edges.push(edge("n_verify", "n_replan", "fail"));
  }

  return {
    id: `loop-${Date.now()}`,
    name: wantsPayment ? "Order Automation" : "Generated Loop",
    version: "1.0.0",
    description: text.slice(0, 160),
    source: "ai",
    nodes,
    edges,
    entryId: "n_trigger",
  };
}

export function wrapCapabilityAsLoop(input: {
  readonly capabilityId: string;
  readonly toolId?: string;
}): LoopDefinition {
  const nodes: LoopNode[] = [
    createLoopNode("INSPECT", "n_inspect", "Inspect"),
    createLoopNode("CAPABILITY", "n_cap", input.capabilityId, {
      capabilityId: input.capabilityId,
      toolId: input.toolId ?? "capability.create",
    }),
    createLoopNode("OBSERVE", "n_obs", "Observe"),
    createLoopNode("VERIFY", "n_verify", "Verify", {
      target: input.capabilityId,
      onSuccess: "complete",
      onFailure: "replan",
    }),
    createLoopNode("COMPLETE", "n_done", "Complete"),
    createLoopNode("REPLAN", "n_replan", "Replan"),
  ];
  return {
    id: `loop-cap-${input.capabilityId}`,
    name: input.capabilityId,
    version: "1.0.0",
    description: `${input.capabilityId} capability loop`,
    source: "visual",
    nodes,
    edges: [
      edge("n_inspect", "n_cap"),
      edge("n_cap", "n_obs"),
      edge("n_obs", "n_verify"),
      edge("n_verify", "n_done", "pass"),
      edge("n_verify", "n_replan", "fail"),
    ],
    entryId: "n_inspect",
  };
}
