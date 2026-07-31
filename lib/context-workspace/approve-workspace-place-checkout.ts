"use client";

/**
 * Workspace Execution Layer — human Approve → Reality Commit → Hub Pay overlay.
 * Stays on Globe/Workspace page (no Field dashboard jump). Article 0: never auto-charge.
 */

import { commitRealityQueueClient } from "@/lib/reality-queue/commit-reality-queue-client";
import { asQueueItem } from "@/lib/reality-queue/types";
import { readWorkspacePlacePreparedOperation } from "@/lib/context-workspace/workspace-place-prepare-status";
import { openLodgingHubCheckout } from "@/lib/globe/hub-checkout/open-lodging-hub-checkout-bridge";
import { copy } from "@/lib/copy/human-ko";

export type ApproveWorkspacePlaceCheckoutResult =
  | { readonly ok: true; readonly openedCheckout: boolean; readonly toastKo: string }
  | { readonly ok: false; readonly reasonKo: string };

/**
 * Human Commit for one prepared place op, then open Hub checkout on top of Workspace.
 */
export async function approveWorkspacePlaceCheckout(input: {
  readonly contextEventId: string;
  readonly placeId: string;
  readonly nodeId?: string | null;
  readonly titleKo?: string | null;
}): Promise<ApproveWorkspacePlaceCheckoutResult> {
  const contextEventId = input.contextEventId.trim();
  const placeId = input.placeId.trim();
  if (!contextEventId || !placeId) {
    return { ok: false, reasonKo: copy.globe.workspacePayNeedsPlace };
  }

  const op = readWorkspacePlacePreparedOperation({
    contextEventId,
    placeId,
    nodeId: input.nodeId,
  });
  if (!op) {
    return { ok: false, reasonKo: copy.globe.workspacePayNeedsPrepare };
  }

  const commit = await commitRealityQueueClient({
    items: [asQueueItem(op)],
    canCommit: true,
    promotePendingOnSign: true,
  });

  if (!commit.ok) {
    // Soft fallback — open Hub pay sheet if inventory already allows (still needs Pay tap).
    const opened = openLodgingHubCheckout({
      contextEventId,
      placeId,
    });
    if (opened) {
      return {
        ok: true,
        openedCheckout: true,
        toastKo: copy.globe.workspacePayCheckoutOpened(
          input.titleKo?.trim() || placeId,
        ),
      };
    }
    return {
      ok: false,
      reasonKo:
        commit.reasonKo ??
        copy.globe.workspacePayCommitFailed,
    };
  }

  // commitRealityQueueClient opens Hub on pending_payment; ensure overlay if missed.
  const opened =
    openLodgingHubCheckout({
      contextEventId,
      placeId,
    }) === true;

  return {
    ok: true,
    openedCheckout: opened || commit.preparedCommittedCount > 0,
    toastKo: copy.globe.workspacePayApproved(
      input.titleKo?.trim() || placeId,
    ),
  };
}
