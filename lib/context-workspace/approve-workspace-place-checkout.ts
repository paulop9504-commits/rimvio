"use client";

/**
 * Workspace Execution Layer — human Approve → Reality Commit → Hub Pay overlay.
 * Stays on Globe/Workspace page (no Field dashboard jump). Article 0: never auto-charge.
 */

import { commitRealityQueueClient } from "@/lib/reality-queue/commit-reality-queue-client";
import { asQueueItem } from "@/lib/reality-queue/types";
import { readWorkspacePlacePreparedOperation } from "@/lib/context-workspace/workspace-place-prepare-status";
import { ensureLodgingInventoryForWorkspaceCheckout } from "@/lib/context-workspace/ensure-lodging-inventory-for-checkout";
import { openLodgingHubCheckout } from "@/lib/globe/hub-checkout/open-lodging-hub-checkout-bridge";
import { copy } from "@/lib/copy/human-ko";
import { readContextWorkspace } from "@/lib/context-workspace/workspace-store";

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

  const node =
    readContextWorkspace(contextEventId)?.nodes.find(
      (n) => n.id === input.nodeId || n.placeId === placeId || n.id === placeId,
    ) ?? null;
  const checkoutPlaceId =
    ensureLodgingInventoryForWorkspaceCheckout({
      contextEventId,
      placeId,
      node,
    }) ?? placeId;

  const tryOpenCheckout = () =>
    openLodgingHubCheckout({
      contextEventId,
      placeId: checkoutPlaceId,
    });

  const commit = await commitRealityQueueClient({
    items: [asQueueItem(op)],
    canCommit: true,
    promotePendingOnSign: true,
  });

  if (!commit.ok) {
    const opened = tryOpenCheckout();
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

  const opened = tryOpenCheckout() === true;

  if (!opened) {
    return {
      ok: false,
      reasonKo: copy.globe.workspacePayCommitFailed,
    };
  }

  return {
    ok: true,
    openedCheckout: true,
    toastKo: copy.globe.workspacePayCheckoutOpened(
      input.titleKo?.trim() || placeId,
    ),
  };
}
