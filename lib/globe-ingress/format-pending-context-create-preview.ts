/**
 * L1 preview + progress copy for Context create / Anchor move.
 */

import { copy } from "@/lib/copy/human-ko";
import type { PendingContextCreateDraft } from "@/lib/globe-ingress/pending-context-create-store";

export function buildPendingContextCreatePreviewText(
  draft: PendingContextCreateDraft,
): string {
  const c = copy.globe.contextAnchor;
  const lines = [
    c.previewHeadline,
    "",
    `${c.fieldName}\n${draft.titleKo}`,
    "",
    `${c.fieldDuration}\n${draft.durationLabelKo ?? c.valueUnset}`,
    "",
    `${c.fieldDate}\n${draft.dateLabelKo ?? c.valueUnset}`,
    "",
    `${c.fieldAnchor}\n${draft.anchorLabelKo}`,
    "",
    `${c.fieldAssistant}\n${c.assistantOn}`,
    "",
    `${c.fieldReality}\n${c.realityDraft}`,
    "",
    c.askApprove,
  ];
  return lines.join("\n");
}

export function buildContextCreateProgressLines(
  draft: PendingContextCreateDraft,
): string[] {
  const c = copy.globe.contextAnchor;
  return [
    c.progressIntent,
    c.progressPlace(draft.travelSlots.destination?.trim() || draft.titleKo),
    c.progressDates,
    c.progressGlobe,
    c.progressAnchor(draft.anchorLabelKo),
    c.progressDone,
  ];
}
