/**
 * Advance Action-Ready lifecycle on Workspace nodes (Prepared → Approved → Committed).
 * Never auto-charges — Commit/Pay stays human.
 */

import type {
  ActionReadyState,
  ContextWorkspaceNode,
  ContextWorkspaceState,
} from "@/lib/context-workspace/types";
import {
  readContextWorkspace,
  writeContextWorkspace,
} from "@/lib/context-workspace/workspace-store";
import { buildRealityDraft } from "@/lib/context-workspace/reality-draft/build-reality-draft";

const ORDER: readonly ActionReadyState[] = [
  "discover",
  "prepare",
  "ready",
  "approved",
  "committed",
];

export function canAdvanceActionReady(
  from: ActionReadyState | null | undefined,
  to: ActionReadyState,
): boolean {
  const a = ORDER.indexOf(from ?? "discover");
  const b = ORDER.indexOf(to);
  return a >= 0 && b >= 0 && b >= a;
}

export function setWorkspaceNodeActionReadyState(input: {
  readonly contextEventId: string;
  readonly nodeId: string;
  readonly state: ActionReadyState;
}): ContextWorkspaceState | null {
  const contextEventId = input.contextEventId.trim();
  const nodeId = input.nodeId.trim();
  if (!contextEventId || !nodeId) return null;

  const prev = readContextWorkspace(contextEventId);
  if (!prev || prev.status === "closed") return null;

  const nodes = prev.nodes.map((n): ContextWorkspaceNode => {
    if (n.id !== nodeId) return n;
    return { ...n, actionReadyState: input.state };
  });

  const realityDraft = prev.realityDraft
    ? buildRealityDraft({
        contextTitleKo: prev.realityDraft.contextTitleKo,
        destinationKo: prev.realityDraft.destinationKo,
        stayLabelKo: prev.realityDraft.stayLabelKo,
        nodes,
      })
    : prev.realityDraft;

  const next: ContextWorkspaceState = {
    ...prev,
    nodes,
    realityDraft: realityDraft ?? prev.realityDraft,
    updatedAtIso: new Date().toISOString(),
    lastChangeKo:
      input.state === "approved"
        ? "확인됨 · 예약 준비 가능"
        : input.state === "committed"
          ? "승인·결제 반영"
          : prev.lastChangeKo,
  };
  writeContextWorkspace(next);
  return next;
}

/** Peek primary CTA from Action-Ready + prepare queue. */
export type PeekPrimaryAction =
  | { readonly kind: "confirm"; readonly labelKo: string; readonly hintKo: string }
  | { readonly kind: "prepare"; readonly labelKo: string; readonly hintKo: string }
  | { readonly kind: "approve_pay"; readonly labelKo: string; readonly hintKo: string }
  | { readonly kind: "done"; readonly labelKo: string; readonly hintKo: string };

export function resolvePeekPrimaryAction(input: {
  readonly node: ContextWorkspaceNode;
  readonly awaitingPrepare: boolean;
  readonly prepareLabelKo: string;
  readonly prepareHintKo: string;
  readonly approveLabelKo: string;
  readonly approveHintKo: string;
  readonly confirmLabelKo: string;
  readonly confirmHintKo: string;
  readonly doneLabelKo: string;
}): PeekPrimaryAction {
  const state = input.node.actionReadyState ?? "discover";
  if (state === "committed") {
    return {
      kind: "done",
      labelKo: input.doneLabelKo,
      hintKo: "",
    };
  }
  if (input.awaitingPrepare || state === "approved") {
    if (input.awaitingPrepare) {
      return {
        kind: "approve_pay",
        labelKo: input.approveLabelKo,
        hintKo: input.approveHintKo,
      };
    }
    return {
      kind: "prepare",
      labelKo: input.prepareLabelKo,
      hintKo: input.prepareHintKo,
    };
  }
  // ready / prepare / discover → human Confirm first
  if (state === "ready" || state === "prepare" || state === "discover") {
    return {
      kind: "confirm",
      labelKo: input.confirmLabelKo,
      hintKo: input.confirmHintKo,
    };
  }
  return {
    kind: "prepare",
    labelKo: input.prepareLabelKo,
    hintKo: input.prepareHintKo,
  };
}
