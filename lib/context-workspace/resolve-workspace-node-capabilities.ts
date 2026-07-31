/**
 * Workspace node → Reality Object capabilities (ADR-018 Peek path).
 * Prefer capability gates over kind forks in Peek CTAs.
 */

import { capabilitiesForDiscoveryCard } from "@/lib/reality-object/gate-place-info-actions";
import {
  hasRealityExecutionCapability,
} from "@/lib/reality-object/capabilities-for-type";
import type { RealityExecutionCapability } from "@/lib/reality-object/types";
import type { ContextWorkspaceNode } from "@/lib/context-workspace/types";
import { copy } from "@/lib/copy/human-ko";

export function workspaceNodePinKind(
  kind: ContextWorkspaceNode["kind"],
): "lodging" | "eatery" | "activity" | "amenity" {
  if (kind === "lodging") return "lodging";
  if (kind === "eatery") return "eatery";
  if (kind === "amenity") return "amenity";
  return "activity";
}

export function resolveWorkspaceNodeCapabilities(
  node: ContextWorkspaceNode,
): readonly RealityExecutionCapability[] {
  return capabilitiesForDiscoveryCard({
    kind: workspaceNodePinKind(node.kind),
    title: node.title,
    categoryLabel: node.tags.slice(0, 2).join(" · ") || null,
  });
}

export function workspaceNodeCanPrepare(
  capabilities: readonly RealityExecutionCapability[],
): boolean {
  return (
    hasRealityExecutionCapability(capabilities, "book_room") ||
    hasRealityExecutionCapability(capabilities, "reserve") ||
    hasRealityExecutionCapability(capabilities, "buy_ticket") ||
    hasRealityExecutionCapability(capabilities, "pay")
  );
}

/** L1 prepare CTA + hint from capabilities (not lodging/eatery/poi forks). */
export function prepareCopyFromCapabilities(
  capabilities: readonly RealityExecutionCapability[],
): { readonly ctaKo: string; readonly hintKo: string; readonly detailKo: string } {
  if (hasRealityExecutionCapability(capabilities, "book_room")) {
    return {
      ctaKo: copy.globe.workspacePrepareReserveCta,
      hintKo: copy.globe.workspacePrepareReserveHint,
      detailKo: copy.globe.workspacePreviewLodgingDetail,
    };
  }
  if (hasRealityExecutionCapability(capabilities, "reserve")) {
    return {
      ctaKo: copy.globe.workspacePrepareEateryCta,
      hintKo: copy.globe.workspacePrepareEateryHint,
      detailKo: copy.globe.workspacePreviewEateryDetail,
    };
  }
  if (hasRealityExecutionCapability(capabilities, "buy_ticket")) {
    return {
      ctaKo: copy.globe.workspacePrepareTicketCta,
      hintKo: copy.globe.workspacePrepareTicketHint,
      detailKo: copy.globe.workspacePreviewGenericDetail,
    };
  }
  return {
    ctaKo: copy.globe.workspacePrepareTicketCta,
    hintKo: copy.globe.workspacePrepareTicketHint,
    detailKo: copy.globe.workspacePreviewGenericDetail,
  };
}
