"use client";

/**
 * One-tap open from WorkspacePrepCard.
 * Travel → existing Context Workspace expand/open.
 * Driver / used_goods → shell or SDK Host (UI listens).
 */

import {
  dispatchContextWorkspaceOpen,
  readContextWorkspace,
  writeContextWorkspaceExpanded,
} from "@/lib/context-workspace/workspace-store";
import type { WorkspacePrepCardModel } from "@/lib/workspace-kind/types";
import { dispatchWorkspaceSdkOpen } from "@/lib/workspace-sdk/workspace-sdk-session-store";

export const DRIVER_WORKSPACE_SHELL_OPEN = "rimvio:driver-workspace-shell-open";

export type DriverWorkspaceShellOpenDetail = {
  readonly contextEventId: string | null;
  readonly utterance: string;
  readonly titleKo: string;
  readonly slotLabelsKo: readonly string[];
};

/**
 * Returns true when a host surface was notified / workspace expanded.
 */
export function openWorkspaceFromPrepCard(
  card: WorkspacePrepCardModel,
): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  if (card.openHint === "travel_workspace") {
    const ctx = card.contextEventId?.trim() ?? "";
    if (!ctx) {
      return false;
    }
    const state = readContextWorkspace(ctx);
    if (!state) {
      return false;
    }
    writeContextWorkspaceExpanded(ctx, true);
    dispatchContextWorkspaceOpen({
      contextEventId: ctx,
      workspaceId: state.workspaceId,
      source: "trip_prep",
    });
    return true;
  }

  if (card.openHint === "used_goods_workspace_shell") {
    const ctx = card.contextEventId?.trim() ?? "";
    if (ctx) {
      dispatchWorkspaceSdkOpen(ctx);
      return true;
    }
  }

  window.dispatchEvent(
    new CustomEvent<DriverWorkspaceShellOpenDetail>(DRIVER_WORKSPACE_SHELL_OPEN, {
      detail: {
        contextEventId: card.contextEventId,
        utterance: card.utterance,
        titleKo: card.titleKo,
        slotLabelsKo: card.slotLabelsKo,
      },
    }),
  );
  return true;
}

