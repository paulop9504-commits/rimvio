import { copy } from "@/lib/copy/human-ko";
import { applyGraphCommands } from "@/lib/graph-command/apply-graph-commands";
import {
  clearSoftConfirmPending,
  readSoftConfirmPending,
} from "@/lib/globe/soft-confirm/soft-confirm-pending-store";

export type ApplySoftConfirmResult =
  | { readonly ok: true; readonly summaryKo: string }
  | {
      readonly ok: false;
      readonly reason: "no_pending" | "apply_failed";
      readonly messageKo: string;
    };

/** Human confirmed — apply pending Graph IR (session Diff only). */
export function applySoftConfirmPending(input: {
  readonly contextEventId: string;
  readonly anchorLat?: number | null;
  readonly anchorLng?: number | null;
  readonly contextLabelKo?: string | null;
}): ApplySoftConfirmResult {
  const contextEventId = input.contextEventId.trim();
  const pending = readSoftConfirmPending(contextEventId);
  if (!pending) {
    return {
      ok: false,
      reason: "no_pending",
      messageKo: copy.globe.softConfirmNoPending,
    };
  }
  const result = applyGraphCommands({
    contextEventId,
    commands: pending.commands,
    anchorLat: input.anchorLat,
    anchorLng: input.anchorLng,
    contextLabelKo: input.contextLabelKo,
  });
  clearSoftConfirmPending(contextEventId);
  if (!result.ok) {
    return {
      ok: false,
      reason: "apply_failed",
      messageKo: copy.globe.softConfirmApplyFailed,
    };
  }
  return { ok: true, summaryKo: pending.summaryKo };
}

export function cancelSoftConfirmPending(contextEventId: string): string {
  clearSoftConfirmPending(contextEventId);
  return copy.globe.softConfirmCancelled;
}
