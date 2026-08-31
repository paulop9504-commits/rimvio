import type { CapabilityAction } from "@/lib/hub/capability/types";
import type { PlatformDraft } from "@/lib/hub/platform/types";

export type WorkflowNodeKind = "capability" | "approval" | "event";

export type WorkflowNode = {
  readonly id: string;
  readonly label: string;
  readonly kind: WorkflowNodeKind;
  readonly capabilityId?: string;
  readonly approvalRequired?: boolean;
  readonly financial?: boolean;
};

export type WorkflowGraph = {
  readonly name: string;
  readonly nodes: readonly WorkflowNode[];
};

const APPROVAL_MARKERS = /user approval|사용자 확인|prepare\s*→\s*commit/i;

export function parseWorkflowGraph(draft: PlatformDraft): WorkflowGraph {
  const text = draft.workflowDescription.trim();
  const segments = text
    .split(/→|->/)
    .map((s) => s.trim())
    .filter(Boolean);

  const nodes: WorkflowNode[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!;
    if (APPROVAL_MARKERS.test(seg) || /user approval/i.test(seg)) {
      nodes.push({
        id: `approval_${i}`,
        label: "USER APPROVAL",
        kind: "approval",
      });
      continue;
    }

    const action = draft.actions.find((a) => a.name === seg);
    nodes.push({
      id: `node_${seg.replace(/\W/g, "_")}_${i}`,
      label: seg,
      kind: "capability",
      capabilityId: seg,
      approvalRequired: action?.approvalRequired,
      financial: seg.startsWith("payment."),
    });
  }

  if (nodes.length === 0 && draft.actions.length > 0) {
    return workflowFromActions(draft.actions, "Platform workflow");
  }

  return {
    name: draft.name ? `${draft.name} flow` : "Workflow",
    nodes,
  };
}

function workflowFromActions(actions: CapabilityAction[], name: string): WorkflowGraph {
  const nodes: WorkflowNode[] = [];
  for (const action of actions) {
    if (action.approvalRequired && action.name.includes("payment")) {
      nodes.push({
        id: `approval_before_${action.id}`,
        label: "USER APPROVAL",
        kind: "approval",
      });
    }
    nodes.push({
      id: `node_${action.id}`,
      label: action.name,
      kind: "capability",
      capabilityId: action.name,
      approvalRequired: action.approvalRequired,
      financial: action.name.startsWith("payment."),
    });
  }
  return { name, nodes };
}
