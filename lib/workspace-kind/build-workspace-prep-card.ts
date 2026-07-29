/**
 * Build one-tap Workspace prep card — resources prepared, CTA opens workspace.
 * Card hints first Focus only — never “open all slots”.
 */

import { copy } from "@/lib/copy/human-ko";
import {
  classifyMarketWorkspaceRole,
  classifyWorkspaceKind,
} from "@/lib/workspace-kind/classify-workspace-kind";
import {
  usedGoodsFocusSequence,
  workspaceKindTemplate,
} from "@/lib/workspace-kind/templates";
import type {
  WorkspaceKind,
  WorkspacePrepCardModel,
} from "@/lib/workspace-kind/types";

function resolveTitleKo(
  kind: WorkspaceKind,
  utterance: string,
  titleOverrideKo?: string | null,
): string {
  const override = titleOverrideKo?.trim();
  if (override) {
    return override;
  }
  if (kind === "travel") {
    return copy.globe.workspacePrepTravelTitle;
  }
  if (kind === "used_goods") {
    return classifyMarketWorkspaceRole(utterance) === "buy"
      ? copy.globe.workspacePrepMarketBuyTitle
      : copy.globe.workspacePrepMarketSellTitle;
  }
  return copy.globe.workspacePrepDriverTitle;
}

function resolveOpenHint(
  kind: WorkspaceKind,
): WorkspacePrepCardModel["openHint"] {
  if (kind === "travel") {
    return "travel_workspace";
  }
  if (kind === "used_goods") {
    return "used_goods_workspace_shell";
  }
  return "driver_workspace_shell";
}

function resolveFocusSlotId(
  kind: WorkspaceKind,
  utterance: string,
): { focusSlotId: string; focusLabel: string } {
  const template = workspaceKindTemplate(kind);
  let sequence = [...template.focusSequence];
  if (kind === "used_goods") {
    sequence = [...usedGoodsFocusSequence(classifyMarketWorkspaceRole(utterance))];
  }
  const focusSlotId = sequence[0] ?? template.slots[0]?.id ?? "";
  const focusLabel =
    template.slots.find((s) => s.id === focusSlotId)?.labelKo ?? focusSlotId;
  return { focusSlotId, focusLabel };
}

/**
 * From NL → prep card. null = no workspace kind (fail closed).
 */
export function buildWorkspacePrepCard(input: {
  readonly utterance: string;
  readonly contextEventId?: string | null;
  readonly titleOverrideKo?: string | null;
  readonly preparedSlotIds?: readonly string[] | null;
  readonly kind?: WorkspaceKind | null;
}): WorkspacePrepCardModel | null {
  const kind = input.kind ?? classifyWorkspaceKind(input.utterance);
  if (!kind) {
    return null;
  }
  const template = workspaceKindTemplate(kind);
  const prepared = new Set(
    (input.preparedSlotIds ?? [])
      .map((id) => id.trim())
      .filter(Boolean),
  );
  const preparedSlotCount =
    prepared.size > 0
      ? template.slots.filter((s) => prepared.has(s.id)).length
      : template.slots.filter((s) => s.required || s.filler === "sensor").length;

  const { focusSlotId, focusLabel } = resolveFocusSlotId(
    kind,
    input.utterance,
  );

  return {
    version: 1,
    kind,
    titleKo: resolveTitleKo(kind, input.utterance, input.titleOverrideKo),
    eyebrowKo: copy.globe.workspacePrepEyebrow,
    bodyKo: copy.globe.workspacePrepBody(
      preparedSlotCount,
      template.slots.length,
    ),
    ctaKo: copy.globe.workspacePrepOpenCta,
    slotLabelsKo: template.slots.map((s) => s.labelKo),
    preparedSlotCount,
    totalSlotCount: template.slots.length,
    contextEventId: input.contextEventId?.trim() || null,
    utterance: input.utterance.trim(),
    openHint: resolveOpenHint(kind),
    focusSlotId,
    focusHintKo: copy.globe.workspacePrepFocusHint(focusLabel),
  };
}

