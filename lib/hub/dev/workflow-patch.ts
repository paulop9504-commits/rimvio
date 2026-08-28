import type { PlatformDraft } from "@/lib/hub/platform/types";
import { parseWorkflowGraph } from "@/lib/hub/dev/workflow-graph";
import { computeJsonLineDiff } from "@/lib/hub/dev/capability-patch";

export type WorkflowPatchPreview = {
  readonly before: string;
  readonly after: string;
  readonly diff: ReturnType<typeof computeJsonLineDiff>;
  readonly applied: boolean;
};

const PENDING_ON_PAYMENT_FAIL =
  /결제\s*실패|payment\s*fail|failed\s*payment/i;
const ADD_USER_APPROVAL = /사용자\s*확인|user\s*approval|승인\s*전/i;
const CANCEL_FLOW = /취소|cancel/i;

export function proposeWorkflowPatchFromUtterance(
  draft: PlatformDraft,
  utterance: string,
): WorkflowPatchPreview | null {
  const text = utterance.trim();
  if (!text) return null;

  let after = draft.workflowDescription;
  let changed = false;

  if (PENDING_ON_PAYMENT_FAIL.test(text)) {
    after = appendWorkflowNote(
      after,
      "payment.fail → booking.pending (hold reservation until retry)",
    );
    changed = true;
  }

  if (ADD_USER_APPROVAL.test(text) && !after.includes("USER APPROVAL")) {
    after = insertBeforeCommit(after);
    changed = true;
  }

  if (CANCEL_FLOW.test(text) && !after.toLowerCase().includes("cancel")) {
    after = `${after} · Cancellation: booking.cancel on user request`;
    changed = true;
  }

  if (!changed) return null;

  return {
    before: draft.workflowDescription,
    after,
    diff: computeJsonLineDiff(
      JSON.stringify({ workflow: draft.workflowDescription }, null, 2),
      JSON.stringify({ workflow: after }, null, 2),
    ),
    applied: false,
  };
}

function appendWorkflowNote(current: string, note: string): string {
  if (current.includes(note)) return current;
  return current.trim() ? `${current} · ${note}` : note;
}

function insertBeforeCommit(workflow: string): string {
  if (workflow.includes("USER APPROVAL")) return workflow;
  const parts = workflow.split("→").map((s) => s.trim());
  const commitIdx = parts.findIndex((p) => /commit|confirm/.test(p));
  if (commitIdx <= 0) {
    return `${workflow} → USER APPROVAL`;
  }
  parts.splice(commitIdx, 0, "USER APPROVAL");
  return parts.join(" → ");
}

export function applyWorkflowPatch(draft: PlatformDraft, after: string): PlatformDraft {
  const graph = parseWorkflowGraph({ ...draft, workflowDescription: after });
  const approvalCaps = graph.nodes
    .filter((n) => n.kind === "capability" && n.approvalRequired)
    .map((n) => n.capabilityId!)
    .filter(Boolean);

  return {
    ...draft,
    workflowDescription: after,
    approval: {
      before: [...new Set([...draft.approval.before, ...approvalCaps])],
    },
  };
}

export function workflowDescriptionFromGraph(draft: PlatformDraft): string {
  const graph = parseWorkflowGraph(draft);
  return graph.nodes.map((n) => n.label).join(" → ");
}
