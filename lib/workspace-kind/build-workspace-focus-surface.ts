/**
 * Resolve One Focus surface — only the current step is Primary.
 * Ghost = focusSequence siblings + explicit background only (not every slot).
 * @see docs/adr/025-one-intent-workspace-focus.md
 */

import { copy } from "@/lib/copy/human-ko";
import { workspaceKindTemplate } from "@/lib/workspace-kind/templates";
import type {
  WorkspaceFocusGhostRow,
  WorkspaceFocusSurface,
  WorkspaceKind,
} from "@/lib/workspace-kind/types";

function slotLabel(kind: WorkspaceKind, slotId: string): string {
  const slot = workspaceKindTemplate(kind).slots.find((s) => s.id === slotId);
  return slot?.labelKo ?? slotId;
}

function ghostLineKo(
  status: WorkspaceFocusGhostRow["status"],
  labelKo: string,
): string {
  if (status === "done") {
    return copy.globe.workspaceFocusGhostDone(labelKo);
  }
  if (status === "background") {
    return copy.globe.workspaceFocusGhostBackground(labelKo);
  }
  return copy.globe.workspaceFocusGhostWaiting(labelKo);
}

/**
 * Build Primary Focus + sparse ghost one-liners.
 * completedSlotIds = finished focus steps.
 * backgroundSlotIds = auto work (budget…) — one line each, never Primary cards.
 */
export function buildWorkspaceFocusSurface(input: {
  readonly kind: WorkspaceKind;
  readonly focusSlotId?: string | null;
  readonly completedSlotIds?: readonly string[] | null;
  readonly backgroundSlotIds?: readonly string[] | null;
  /** Override template focus order (e.g. used_goods buy vs sell). */
  readonly focusSequenceOverride?: readonly string[] | null;
}): WorkspaceFocusSurface {
  const template = workspaceKindTemplate(input.kind);
  const sequence =
    input.focusSequenceOverride && input.focusSequenceOverride.length > 0
      ? [...input.focusSequenceOverride]
      : [...template.focusSequence];
  const completed = new Set(
    (input.completedSlotIds ?? []).map((id) => id.trim()).filter(Boolean),
  );
  const background = new Set(
    (input.backgroundSlotIds ?? []).map((id) => id.trim()).filter(Boolean),
  );

  let focusSlotId = input.focusSlotId?.trim() || "";
  if (!focusSlotId || !sequence.includes(focusSlotId)) {
    focusSlotId =
      sequence.find((id) => !completed.has(id)) ?? sequence[0] ?? "hotel";
  }

  const focusIndex = Math.max(0, sequence.indexOf(focusSlotId));
  const focusLabelKo = slotLabel(input.kind, focusSlotId);

  const ghostRows: WorkspaceFocusGhostRow[] = [];
  for (const slotId of sequence) {
    if (slotId === focusSlotId) {
      continue;
    }
    const labelKo = slotLabel(input.kind, slotId);
    const status = completed.has(slotId) ? "done" : "waiting";
    ghostRows.push({
      slotId,
      labelKo,
      status,
      lineKo: ghostLineKo(status, labelKo),
    });
  }
  for (const slotId of background) {
    if (slotId === focusSlotId || sequence.includes(slotId)) {
      continue;
    }
    const labelKo = slotLabel(input.kind, slotId);
    ghostRows.push({
      slotId,
      labelKo,
      status: "background",
      lineKo: ghostLineKo("background", labelKo),
    });
  }

  return {
    version: 1,
    kind: input.kind,
    focusSlotId,
    focusIndex,
    focusTotal: sequence.length,
    focusLabelKo,
    headlineKo: copy.globe.workspaceFocusHeadline(focusLabelKo),
    askKo: copy.globe.workspaceFocusAsk(focusLabelKo),
    ghostRows,
  };
}

/** Advance Focus after completing current step. null = sequence finished. */
export function advanceWorkspaceFocus(input: {
  readonly kind: WorkspaceKind;
  readonly completedSlotIds: readonly string[];
  readonly focusSequenceOverride?: readonly string[] | null;
}): WorkspaceFocusSurface | null {
  const sequence =
    input.focusSequenceOverride && input.focusSequenceOverride.length > 0
      ? input.focusSequenceOverride
      : workspaceKindTemplate(input.kind).focusSequence;
  const completed = new Set(input.completedSlotIds.map((id) => id.trim()));
  const next = sequence.find((id) => !completed.has(id));
  if (!next) {
    return null;
  }
  return buildWorkspaceFocusSurface({
    kind: input.kind,
    focusSlotId: next,
    completedSlotIds: input.completedSlotIds,
    focusSequenceOverride: input.focusSequenceOverride,
  });
}
