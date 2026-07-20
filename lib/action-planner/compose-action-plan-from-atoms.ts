/**
 * Compose ActionPlanV1 from IntentAtoms — reject never Field-enqueues.
 */

import type { ActionPlanStepV1, ActionPlanV1 } from "@/lib/action-planner/types";
import { ACTION_PLAN_VERSION } from "@/lib/action-planner/types";
import type { IntentAtom } from "@/lib/action-planner/intent-atom-types";
import {
  buildSearchPaymentActionPlan,
  buildFilterNavigateActionPlan,
  buildMoveShareActionPlan,
  buildCompareFilterActionPlan,
  buildSearchReserveActionPlan,
  buildCompareReserveActionPlan,
  buildFilterReserveActionPlan,
} from "@/lib/action-planner/build-compare-reserve-plan";
import type { SessionGraphV1 } from "@/lib/graph-command/types";
import {
  listVisiblePlaceNodes,
  ordinalRefFromGraph,
  selectionRefFromGraph,
} from "@/lib/graph-command/resolve-selection-ref";
import { resolveLookupToolId } from "@/lib/rule-engine/resolve-tool-id";

function rejectedFamilies(atoms: readonly IntentAtom[]): Set<string> {
  return new Set(
    atoms.filter((a) => a.polarity === "reject").map((a) => a.family),
  );
}

function doAtoms(atoms: readonly IntentAtom[]): IntentAtom[] {
  return atoms.filter((a) => a.polarity === "do");
}

function rejectSummaryKo(atoms: readonly IntentAtom[]): string {
  const labels = atoms
    .filter((a) => a.polarity === "reject")
    .map((a) => a.cueSpan || a.family);
  if (labels.length === 0) {
    return "";
  }
  return `${labels.join("·")} 말고 `;
}

function newShell(input: {
  utterance: string;
  contextEventId: string;
  steps: readonly ActionPlanStepV1[];
  requiresFieldCommit: boolean;
  planKind: ActionPlanV1["planKind"];
}): ActionPlanV1 {
  const planId = `aplan:${input.contextEventId}:${Date.now().toString(36)}`;
  return {
    version: ACTION_PLAN_VERSION,
    planId,
    contextEventId: input.contextEventId,
    utterance: input.utterance,
    steps: input.steps,
    createdAtIso: new Date().toISOString(),
    diffBundleId: `${planId}:diff`,
    planKind: input.planKind,
    requiresFieldCommit: input.requiresFieldCommit,
  };
}

function pickTargetRef(graph: SessionGraphV1 | null, atom: IntentAtom) {
  if (atom.selection?.ordinal != null) {
    return ordinalRefFromGraph(graph, atom.selection.ordinal);
  }
  if (atom.selection?.deictic) {
    return (
      selectionRefFromGraph(graph) ?? ordinalRefFromGraph(graph, 0)
    );
  }
  const selected = selectionRefFromGraph(graph);
  if (selected) {
    return selected;
  }
  const first = listVisiblePlaceNodes(graph)[0];
  if (first) {
    return { labelKo: first.labelKo, nodeId: first.id };
  }
  return { labelKo: "선택", nodeId: null as string | null };
}

/**
 * Build plan from multi-intent atoms. Returns null when legacy single path should run.
 */
export function composeActionPlanFromAtoms(input: {
  utterance: string;
  contextEventId: string;
  atoms: readonly IntentAtom[];
  graph?: SessionGraphV1 | null;
}): ActionPlanV1 | null {
  const atoms = input.atoms;
  if (atoms.length === 0) {
    return null;
  }
  const rejected = rejectedFamilies(atoms);
  const dos = doAtoms(atoms);
  if (dos.length === 0) {
    return null;
  }

  const graph = input.graph ?? null;
  const prefix = rejectSummaryKo(atoms);

  // Prefer known pairwise macros when reject does not block them.
  const macroUtterance = dos.map((a) => a.cueSpan).join(" ");
  if (rejected.size === 0) {
    const macro =
      buildCompareReserveActionPlan({
        utterance: macroUtterance,
        contextEventId: input.contextEventId,
        graph,
      }) ??
      buildCompareFilterActionPlan({
        utterance: macroUtterance,
        contextEventId: input.contextEventId,
        graph,
      }) ??
      buildSearchReserveActionPlan({
        utterance: macroUtterance,
        contextEventId: input.contextEventId,
        graph,
      }) ??
      buildSearchPaymentActionPlan({
        utterance: macroUtterance,
        contextEventId: input.contextEventId,
        graph,
      }) ??
      buildFilterReserveActionPlan({
        utterance: macroUtterance,
        contextEventId: input.contextEventId,
        graph,
      }) ??
      buildFilterNavigateActionPlan({
        utterance: macroUtterance,
        contextEventId: input.contextEventId,
        graph,
      }) ??
      buildMoveShareActionPlan({
        utterance: macroUtterance,
        contextEventId: input.contextEventId,
        graph,
      });
    if (macro) {
      return macro;
    }
  }

  const steps: ActionPlanStepV1[] = [];
  let requiresFieldCommit = false;
  let stepI = 0;

  for (const atom of dos) {
    if (rejected.has(atom.family)) {
      continue;
    }

    if (atom.family === "Select") {
      const ref = pickTargetRef(graph, atom);
      steps.push({
        id: `step:select:${stepI++}`,
        kind: "graph_command",
        labelKo: `${prefix}${ref?.labelKo ?? "선택"} 고르기`,
        status: "pending",
        diffPhase: "working_set",
        graphCommand: {
          op: "style_pin",
          targetRef: ref ?? { labelKo: "선택", nodeId: null },
          accent: "default",
        },
        noteKo: "선택만 · Field 없음",
      });
      continue;
    }

    if (atom.family === "Navigate") {
      steps.push({
        id: `step:nav:${stepI++}`,
        kind: "soft_navigate",
        labelKo: `${prefix}길 열기`,
        status: "pending",
        diffPhase: "working_set",
        noteKo: atom.cueSpan,
      });
      continue;
    }

    if (atom.family === "Search") {
      const toolId = resolveLookupToolId("lodging");
      steps.push({
        id: `step:search:${stepI++}`,
        kind: "tool",
        labelKo: "찾기",
        status: "pending",
        toolId,
        diffPhase: "working_set",
        noteKo: atom.cueSpan,
      });
      continue;
    }

    if (atom.family === "Filter") {
      steps.push({
        id: `step:filter:${stepI++}`,
        kind: "graph_command",
        labelKo: "조건으로 남기기",
        status: "pending",
        diffPhase: "working_set",
        graphCommand: {
          op: "filter",
          predicate: { sortBy: "price_asc" },
        },
      });
      continue;
    }

    if (atom.family === "Compare") {
      const places = listVisiblePlaceNodes(graph);
      if (places.length >= 2) {
        steps.push({
          id: `step:compare:${stepI++}`,
          kind: "graph_command",
          labelKo: "비교",
          status: "pending",
          diffPhase: "working_set",
          graphCommand: {
            op: "compare",
            leftRef: { labelKo: places[0]!.labelKo, nodeId: places[0]!.id },
            rightRef: { labelKo: places[1]!.labelKo, nodeId: places[1]!.id },
          },
        });
      }
      continue;
    }

    if (atom.family === "Share") {
      const ref = pickTargetRef(graph, atom);
      steps.push({
        id: `step:share:${stepI++}`,
        kind: "graph_command",
        labelKo: "공유 준비",
        status: "pending",
        diffPhase: "working_set",
        graphCommand: {
          op: "share_context",
          targetRef: ref ?? { labelKo: "선택", nodeId: null },
        },
      });
      continue;
    }

    if (atom.family === "Move") {
      const ref = pickTargetRef(graph, atom);
      steps.push({
        id: `step:move:${stepI++}`,
        kind: "graph_command",
        labelKo: "맥락으로 옮기기",
        status: "pending",
        diffPhase: "working_set",
        graphCommand: {
          op: "move_context",
          targetRef: ref ?? { labelKo: "선택", nodeId: null },
          toContextEventId: "ctx-folder:여행",
          folderLabelKo: "여행",
        },
      });
      continue;
    }

    if (atom.family === "Reserve" && !rejected.has("Reserve")) {
      const ref = pickTargetRef(graph, atom);
      steps.push({
        id: `step:reserve:${stepI++}`,
        kind: "graph_command",
        labelKo: "예약 준비",
        status: "pending",
        diffPhase: "field_gate",
        graphCommand: {
          op: "reserve_prep",
          targetRef: ref ?? { labelKo: "선택", nodeId: null },
        },
      });
      steps.push({
        id: `step:wait:${stepI++}`,
        kind: "wait_commit",
        labelKo: "승인 대기",
        status: "pending",
        diffPhase: "field_gate",
      });
      requiresFieldCommit = true;
      continue;
    }

    if (atom.family === "Purchase" && !rejected.has("Purchase")) {
      const ref = pickTargetRef(graph, atom);
      steps.push({
        id: `step:pay:${stepI++}`,
        kind: "graph_command",
        labelKo: "결제 준비",
        status: "pending",
        diffPhase: "field_gate",
        graphCommand: {
          op: "payment_prep",
          targetRef: ref ?? { labelKo: "선택", nodeId: null },
        },
      });
      steps.push({
        id: `step:wait:${stepI++}`,
        kind: "wait_commit",
        labelKo: "승인 대기",
        status: "pending",
        diffPhase: "field_gate",
      });
      requiresFieldCommit = true;
      continue;
    }

    if (atom.family === "Delete" && !rejected.has("Delete")) {
      const ref = pickTargetRef(graph, atom);
      steps.push({
        id: `step:del:${stepI++}`,
        kind: "graph_command",
        labelKo: "지우기",
        status: "pending",
        diffPhase: "working_set",
        graphCommand: {
          op: "delete_node",
          targetRef: ref ?? { labelKo: "선택", nodeId: null },
        },
      });
    }
  }

  if (steps.length === 0) {
    return null;
  }

  // Use search_payment kind as generic multi when mixed; filter_navigate for nav-only.
  const planKind: ActionPlanV1["planKind"] =
    dos.some((a) => a.family === "Purchase") &&
    dos.some((a) => a.family === "Search")
      ? "search_payment"
      : dos.some((a) => a.family === "Navigate") &&
          dos.some((a) => a.family === "Filter")
        ? "filter_navigate"
        : dos.some((a) => a.family === "Share") &&
            dos.some((a) => a.family === "Move")
          ? "move_share"
          : dos.some((a) => a.family === "Purchase")
            ? "search_payment"
            : dos.some((a) => a.family === "Navigate")
              ? "filter_navigate"
              : "search_reserve";

  return newShell({
    utterance: input.utterance,
    contextEventId: input.contextEventId,
    steps,
    requiresFieldCommit,
    planKind,
  });
}

export function formatMultiIntentPreviewKo(
  atoms: readonly IntentAtom[],
  plan: ActionPlanV1,
): string {
  const reject = atoms
    .filter((a) => a.polarity === "reject")
    .map((a) => a.cueSpan)
    .join("·");
  const head = reject ? `${reject}은 건너뛰고 · ` : "";
  const lines = plan.steps.map((s, i) => `${i + 1}. ${s.labelKo}`);
  return `${head}이렇게 진행할게요\n${lines.join("\n")}`;
}
