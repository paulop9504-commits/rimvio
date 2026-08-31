import type { PlatformDraft } from "@/lib/hub/platform/types";
import { parseWorkflowGraph } from "@/lib/hub/dev/workflow-graph";

export type CommerceProductRow = {
  readonly id: string;
  readonly name: string;
  readonly schema: string;
  readonly pii: boolean;
};

export type CommerceFlowStep = {
  readonly id: string;
  readonly label: string;
  readonly financial: boolean;
  readonly approval: boolean;
};

export type CommercePanelView = {
  readonly provider: string;
  readonly notes: string;
  readonly collections: readonly CommerceProductRow[];
  readonly paymentFlow: readonly CommerceFlowStep[];
  readonly hasPaymentCommit: boolean;
  readonly creatorOwned: true;
};

export function buildCommercePanelView(draft: PlatformDraft): CommercePanelView {
  let collections: CommerceProductRow[] = [];
  try {
    const parsed = JSON.parse(draft.dataCollectionsJson) as {
      name: string;
      schema: string;
      pii?: boolean;
    }[];
    collections = parsed.map((c) => ({
      id: c.name,
      name: c.name,
      schema: c.schema,
      pii: Boolean(c.pii),
    }));
  } catch {
    collections = [];
  }

  const graph = parseWorkflowGraph(draft);
  const paymentFlow: CommerceFlowStep[] = graph.nodes
    .filter((n) => n.kind === "capability" || n.kind === "approval")
    .map((n) => ({
      id: n.id,
      label: n.label,
      financial: Boolean(n.financial),
      approval: n.kind === "approval" || Boolean(n.approvalRequired),
    }));

  const providerMatch = draft.commerceNotes.match(/Stripe|Kakao|Toss|card/i);
  const provider = providerMatch ? providerMatch[0]! : "Not configured";

  return {
    provider,
    notes: draft.commerceNotes || "No commerce notes — configure in Platform draft.",
    collections: collections.filter((c) => /payment|order|booking/i.test(c.name)),
    paymentFlow,
    hasPaymentCommit: draft.actions.some((a) => a.name === "payment.commit"),
    creatorOwned: true,
  };
}
