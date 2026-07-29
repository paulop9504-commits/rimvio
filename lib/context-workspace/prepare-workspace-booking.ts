/**
 * Context Workspace → booking.prepare (Select gate). Never Reality Commit.
 */

import { runBookingPrepareAgent } from "@/lib/agent-runtime";
import type { ContextWorkspaceNode } from "@/lib/context-workspace/types";
import { copy } from "@/lib/copy/human-ko";

export type PrepareWorkspaceBookingResult =
  | { readonly ok: true; readonly toastKo: string }
  | { readonly ok: false; readonly reasonKo: string };

function nodeKindForPrepare(
  kind: ContextWorkspaceNode["kind"],
): "lodging" | "eatery" | "activity" {
  if (kind === "eatery") return "eatery";
  if (kind === "poi" || kind === "amenity") return "activity";
  return "lodging";
}

/** Prepare-only. Requires explicit Preview 「선택」 (`node.selected`). */
export function prepareWorkspaceNodeBooking(input: {
  readonly contextEventId: string;
  readonly node: ContextWorkspaceNode;
  readonly contextLabelKo?: string | null;
}): PrepareWorkspaceBookingResult {
  const ctx = input.contextEventId.trim();
  if (!ctx) {
    return { ok: false, reasonKo: "맥락이 없어요" };
  }
  if (!input.node.selected) {
    return {
      ok: false,
      reasonKo: copy.globe.workspacePreviewSelectFirstHint,
    };
  }
  const placeName = input.node.title.trim();
  const placeId = (input.node.placeId || input.node.id).trim();
  if (!placeName || !placeId) {
    return { ok: false, reasonKo: "먼저 숙소를 골라 주세요" };
  }
  const prepared = runBookingPrepareAgent({
    contextEventId: ctx,
    placeId,
    placeName,
    kind: nodeKindForPrepare(input.node.kind),
    lat: input.node.lat,
    lng: input.node.lng,
    contextLabelKo: input.contextLabelKo,
    amountLabel: input.node.amountLabel,
  });
  if (!prepared.ok) {
    return { ok: false, reasonKo: prepared.reasonKo };
  }
  return {
    ok: true,
    toastKo: copy.globe.workspaceSdkActionReadyHint(placeName),
  };
}
