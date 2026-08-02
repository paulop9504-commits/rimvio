/**
 * Action Proposal — Intent → Preview (before Draft apply).
 */

import type {
  RealityActionProposal,
  RealityCommandIntent,
} from "@/lib/reality-command/types";
import { formatRealityIntentPreviewKo } from "@/lib/reality-command/intent-resolver";

export function buildRealityActionProposal(input: {
  readonly intent: RealityCommandIntent;
  readonly draftId?: string | null;
  readonly draftStatus?: "proposed" | null;
}): RealityActionProposal {
  const previewKo = formatRealityIntentPreviewKo(input.intent);
  return {
    intent: input.intent,
    previewKo,
    applyLabelKo: "적용",
    cancelLabelKo: "취소",
    draftId: input.draftId ?? null,
    draftStatus: input.draftStatus ?? null,
  };
}
