/**
 * Place Action Graph ↔ Reality Pipeline bridge.
 * Entity open → ensure pipeline row; Action → Inbox prepare (sync explorer); never Commit.
 */

import {
  openPlaceExploreSession,
} from "@/lib/globe/entity-explore/open-place-explore-session";
import type { PlaceExploreContextBias } from "@/lib/globe/entity-explore/build-place-explore-graph";
import type {
  PlaceExploreEntity,
  PlaceExploreGraphNode,
  PlaceExploreSessionV1,
} from "@/lib/globe/entity-explore/types";
import {
  readRealityPipelineSnapshot,
  type RealityPipelineSnapshotV1,
} from "@/lib/reality-pipeline/reality-pipeline-store";
import {
  runRealityIngressPipeline,
  syncRealityPipelineAfterOperationChange,
} from "@/lib/reality-pipeline/run-reality-ingress-pipeline";
import { enqueuePlacePrepToExecutionInbox } from "@/lib/reality-queue/enqueue-place-prep-operation";
import type { RealityOperationV1 } from "@/lib/reality-queue/types";

export function ensurePlaceActionPipeline(input: {
  contextEventId: string;
  placeTitleKo: string;
  contextLabelKo?: string | null;
  destinationLabelKo?: string | null;
}): RealityPipelineSnapshotV1 | null {
  const ctx = input.contextEventId.trim();
  if (!ctx) {
    return null;
  }
  const existing = readRealityPipelineSnapshot(ctx);
  if (existing) {
    return existing;
  }
  const place = input.placeTitleKo.trim() || "장소";
  const folder = input.contextLabelKo?.trim() || place;
  return runRealityIngressPipeline({
    contextEventId: ctx,
    utterance: `${place} · ${folder}`,
    destinationLabelKo:
      input.destinationLabelKo?.trim() || folder || place,
    contextLabelKo: folder,
    seedExecutionInbox: false,
  });
}

/** Open Action Graph shell and bind context to Reality Pipeline (no travel seed). */
export function openPlaceActionGraphWithPipeline(input: {
  entity: PlaceExploreEntity;
  bias?: PlaceExploreContextBias;
}): PlaceExploreSessionV1 {
  const session = openPlaceExploreSession(input);
  const ctx = session.graph.entity.contextEventId?.trim();
  if (ctx) {
    ensurePlaceActionPipeline({
      contextEventId: ctx,
      placeTitleKo: session.graph.entity.titleKo,
      contextLabelKo: session.graph.entity.contextLabelKo,
    });
  }
  return session;
}

export type PlaceExploreActionPipelineResult =
  | {
      readonly ok: true;
      readonly eventId: string;
      readonly operation: RealityOperationV1;
      readonly toastKind: "inbox" | "ask_ai";
    }
  | {
      readonly ok: true;
      readonly eventId: string;
      readonly side: "directions" | "schedule";
      readonly operation?: undefined;
      readonly toastKind?: undefined;
    }
  | {
      readonly ok: false;
      readonly reason: "no_context" | "not_action";
    };

/**
 * Action node → Execution Inbox prepare + pipeline explorer sync.
 * directions / schedule are side-effects only (still ensure pipeline when context exists).
 */
export function runPlaceExploreActionPipeline(input: {
  entity: PlaceExploreEntity;
  node: PlaceExploreGraphNode;
  fallbackContextEventId?: string | null;
}): PlaceExploreActionPipelineResult {
  const actionId = input.node.actionId;
  if (!actionId) {
    return { ok: false, reason: "not_action" };
  }

  const eventId =
    input.entity.contextEventId?.trim() ||
    input.fallbackContextEventId?.trim() ||
    "";
  if (!eventId) {
    return { ok: false, reason: "no_context" };
  }

  ensurePlaceActionPipeline({
    contextEventId: eventId,
    placeTitleKo: input.entity.titleKo,
    contextLabelKo: input.entity.contextLabelKo,
  });

  if (actionId === "directions") {
    return { ok: true, eventId, side: "directions" };
  }
  if (actionId === "add_to_schedule") {
    return { ok: true, eventId, side: "schedule" };
  }

  const kind =
    actionId === "find_lodging"
      ? "lodging"
      : actionId === "reserve_prep"
        ? "activity"
        : "activity";

  const operation = enqueuePlacePrepToExecutionInbox({
    contextEventId: eventId,
    contextLabelKo: input.entity.contextLabelKo,
    placeId: input.entity.placeId,
    placeName: input.entity.titleKo,
    kind,
    partySize: 2,
    reserveAtLabelKo: "19:00",
    reasonLinesKo: [input.node.labelKo, input.node.detailKo].filter(
      (line): line is string => Boolean(line?.trim()),
    ),
    lat: input.entity.lat,
    lng: input.entity.lng,
  });

  // enqueue already syncs; refresh once more so Field picks latest explorer.
  syncRealityPipelineAfterOperationChange({
    contextEventId: eventId,
    utterance: `${input.entity.titleKo} · ${input.node.labelKo}`,
    contextLabelKo: input.entity.contextLabelKo,
    destinationLabelKo: input.entity.contextLabelKo,
  });

  return {
    ok: true,
    eventId,
    operation,
    toastKind: actionId.startsWith("ask_ai") ? "ask_ai" : "inbox",
  };
}

/** After Explore map project — keep pipeline row alive for this context. */
export function syncPlaceExploreProjectionPipeline(input: {
  entity: PlaceExploreEntity;
  exploreLabelKo: string;
}): RealityPipelineSnapshotV1 | null {
  const ctx = input.entity.contextEventId?.trim();
  if (!ctx) {
    return null;
  }
  const ensured = ensurePlaceActionPipeline({
    contextEventId: ctx,
    placeTitleKo: input.entity.titleKo,
    contextLabelKo: input.entity.contextLabelKo,
  });
  if (!ensured) {
    return null;
  }
  return syncRealityPipelineAfterOperationChange({
    contextEventId: ctx,
    utterance: `${input.entity.titleKo} · ${input.exploreLabelKo}`,
    contextLabelKo: input.entity.contextLabelKo,
    destinationLabelKo: input.entity.contextLabelKo,
  });
}
