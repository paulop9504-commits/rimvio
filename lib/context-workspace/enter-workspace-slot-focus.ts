/**
 * Slot chip → Candidate expand (lodging / eatery).
 * Soft focus for filled places; live lookup when the slot is still empty.
 */

import { appendWorkspaceChatTurn } from "@/lib/context-workspace/workspace-chat-store";
import {
  isWorkspacePlaceCandidateNode,
  isWorkspaceReadySlotNode,
  resolveExpandableSlotKind,
} from "@/lib/context-workspace/workspace-map-focus";
import { resolveWorkspaceFocusNode } from "@/lib/context-workspace/resolve-workspace-focus-node";
import {
  openLodgingContextWorkspace,
  openMapContextWorkspace,
} from "@/lib/context-workspace/open-map-workspace";
import { resolveWorkspaceContextDestinationKo } from "@/lib/context-workspace/stamp-trip-draft-onto-context";
import {
  readContextWorkspace,
  type ContextWorkspaceDomain,
  type ContextWorkspaceNode,
} from "@/lib/context-workspace";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { invokeRimvioToolAsync } from "@/lib/tool-registry/invoke-rimvio-tool";
import { copy } from "@/lib/copy/human-ko";
import { domainLabelKo } from "@/lib/context-workspace/types";

export type EnterWorkspaceSlotFocusResult = {
  readonly mode: "slot_expand" | "soft_focus";
  readonly focusId: string;
  /** null = itinerary overview on map */
  readonly mapFocusKind: ContextWorkspaceDomain | null;
  readonly candidateCount: number;
  readonly replyKo: string | null;
};

function destinationFromWorkspace(
  contextEventId: string,
): string {
  const state = readContextWorkspace(contextEventId);
  const event = findLifeEventCandidate(contextEventId);
  const dest = resolveWorkspaceContextDestinationKo({
    realityDraftDestinationKo: state?.realityDraft?.destinationKo,
    query: state?.query,
    eventPlace: event?.place,
    eventTitle: event?.title,
    metadata: event?.metadata ?? null,
  });
  return dest.trim() || "여행지";
}

function listCandidatesOfKind(
  nodes: readonly ContextWorkspaceNode[],
  kind: ContextWorkspaceDomain,
): ContextWorkspaceNode[] {
  return nodes.filter(
    (n) => n.kind === kind && isWorkspacePlaceCandidateNode(n),
  );
}

function seedLatLng(nodes: readonly ContextWorkspaceNode[]): {
  lat?: number;
  lng?: number;
} {
  const seed =
    nodes.find((n) => n.selected && n.visible) ??
    nodes.find((n) => n.source === "trip_prep_draft" && n.visible) ??
    nodes.find((n) => n.visible) ??
    null;
  if (!seed || !Number.isFinite(seed.lat) || !Number.isFinite(seed.lng)) {
    return {};
  }
  return { lat: seed.lat, lng: seed.lng };
}

async function ensureDomainCandidates(input: {
  readonly contextEventId: string;
  readonly kind: ContextWorkspaceDomain;
  readonly dest: string;
}): Promise<number> {
  const { contextEventId, kind, dest } = input;
  const prev = readContextWorkspace(contextEventId);
  if (!prev) return 0;

  const existing = listCandidatesOfKind(prev.nodes, kind);
  if (existing.length > 0) {
    return existing.length;
  }

  const toolId =
    kind === "eatery" ? "restaurant.lookup" : "hotel.lookup";
  const query =
    kind === "eatery" ? `${dest} 맛집` : `${dest} 숙소`;
  const { lat, lng } = seedLatLng(prev.nodes);

  const tool = await invokeRimvioToolAsync(toolId, {
    query,
    utterance: query,
    contextEventId,
    lat,
    lng,
    domain: kind,
  });

  const raw = tool.candidates ?? [];
  const live = raw.filter((c) => {
    const id = c.id ?? "";
    if (id.startsWith("search:")) return false;
    if (c.source === "seed") return false;
    return true;
  });
  const candidates =
    live.length > 0
      ? live
      : raw.filter((c) => {
          const id = c.id ?? "";
          if (id.startsWith("search:")) return false;
          return (
            c.source === "seed" ||
            id.startsWith("lodging:") ||
            id.startsWith("eatery:")
          );
        });

  if (candidates.length === 0) {
    return 0;
  }

  if (kind === "lodging") {
    openLodgingContextWorkspace({
      contextEventId,
      query,
      summaryKo: copy.globe.workspacePreviewReady(candidates.length),
      candidates,
      source: "trip_prep",
    });
  } else {
    openMapContextWorkspace({
      contextEventId,
      domain: kind,
      query,
      summaryKo: copy.globe.workspacePreviewReady(candidates.length),
      candidates,
      source: "trip_prep",
    });
  }

  return (
    listCandidatesOfKind(
      readContextWorkspace(contextEventId)?.nodes ?? [],
      kind,
    ).length || candidates.length
  );
}

/**
 * Chat/map chip tap — expand empty lodging/eatery slots into candidates.
 */
export async function enterWorkspaceSlotFocus(input: {
  readonly contextEventId: string;
  readonly nodeId: string;
  readonly titleHint?: string | null;
}): Promise<EnterWorkspaceSlotFocusResult> {
  const contextEventId = input.contextEventId.trim();
  const state = readContextWorkspace(contextEventId);
  if (!state || !contextEventId) {
    return {
      mode: "soft_focus",
      focusId: input.nodeId,
      mapFocusKind: null,
      candidateCount: 0,
      replyKo: null,
    };
  }

  const resolved = resolveWorkspaceFocusNode(
    state.nodes,
    input.nodeId,
    input.titleHint,
  );
  const node = resolved;
  const focusId = node?.id ?? input.nodeId;
  const expandKind = resolveExpandableSlotKind(node);

  if (!expandKind) {
    // Real place (or day skeleton) — soft focus; if it's a filled lodging/eatery,
    // keep map in that domain so One Focus stays readable.
    const mapFocusKind =
      node &&
      isWorkspacePlaceCandidateNode(node) &&
      (node.kind === "lodging" || node.kind === "eatery")
        ? node.kind
        : null;
    const why =
      node?.summaryKo.trim() ||
      (node ? `${domainLabelKo(node.kind)} 후보` : null);
    const replyKo =
      node != null
        ? `${copy.globe.workspacePreviewEyebrow} · ${node.title}${why ? `\n${why}` : ""}`
        : null;
    return {
      mode: "soft_focus",
      focusId,
      mapFocusKind,
      candidateCount: 0,
      replyKo,
    };
  }

  const dest = destinationFromWorkspace(contextEventId);
  const label = domainLabelKo(expandKind);
  let count = 0;
  try {
    count = await ensureDomainCandidates({
      contextEventId,
      kind: expandKind,
      dest,
    });
  } catch {
    count = listCandidatesOfKind(
      readContextWorkspace(contextEventId)?.nodes ?? [],
      expandKind,
    ).length;
  }

  const live = readContextWorkspace(contextEventId);
  const candidates = listCandidatesOfKind(live?.nodes ?? [], expandKind);
  const firstId = candidates[0]?.id ?? focusId;

  const replyKo =
    count > 0
      ? copy.globe.workspaceSlotExpandReady(label, count)
      : copy.globe.workspaceSlotExpandEmpty(label);

  return {
    mode: "slot_expand",
    focusId: firstId,
    mapFocusKind: expandKind,
    candidateCount: candidates.length,
    replyKo,
  };
}

export {
  isWorkspaceReadySlotNode,
  isWorkspacePlaceCandidateNode,
  resolveExpandableSlotKind,
};
