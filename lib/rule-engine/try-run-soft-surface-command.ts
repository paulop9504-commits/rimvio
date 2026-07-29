/**
 * Soft Navigate / Calendar — place resolve here, execution via Tool Registry.
 * Navigate: only succeed with a real mapsUrl.
 * Calendar: only succeed when Field calendar prep was enqueued.
 */

import type { SessionGraphV1 } from "@/lib/graph-command/types";
import { classifyIntentFamily } from "@/lib/rule-engine/classify-intent-family";
import { resolveGraphEntityRef } from "@/lib/graph-command/resolve-graph-entity";
import {
  isDeicticTargetLabel,
  resolveSelectionOrOrdinalRef,
} from "@/lib/graph-command/resolve-selection-ref";
import { extractBookingTargetLabel } from "@/lib/globe/context-action-injection/resolve-context-action-intent";
import { invokeRimvioTool } from "@/lib/tool-registry";

export type SoftCommandResult = {
  readonly ok: true;
  readonly assistantReplyKo: string;
  readonly mapsUrl: string | null;
  readonly kind: "navigate" | "calendar";
  readonly reservedOpIds?: readonly string[];
  readonly waitingCommit?: boolean;
};

function extractNamedPlace(text: string): string | null {
  const fromBook = extractBookingTargetLabel(
    text.replace(
      /(?:길\s*찾|내비|가는\s*길|지도|캘린더|일정|택시|지하철|도보).*$/iu,
      "예약",
    ),
  );
  if (fromBook && !isDeicticTargetLabel(fromBook)) {
    return fromBook;
  }
  const nav = text.match(
    /^(.+?)\s*(?:을|를|로|까지)?\s*(?:길\s*찾|내비|가는\s*길|지도로\s*가|가는\s*방법|택시로|지하철로|도보로)/iu,
  );
  if (nav?.[1]?.trim()) {
    const label = nav[1]
      .trim()
      .replace(/(?:을|를|이|가|은|는|로|까지)$/u, "")
      .trim();
    if (!isDeicticTargetLabel(label)) {
      return label;
    }
  }
  return null;
}

function resolvePlaceNode(
  text: string,
  graph: SessionGraphV1 | null,
): {
  labelKo: string;
  nodeId: string | null;
  lat: number | null;
  lng: number | null;
} | null {
  const named = extractNamedPlace(text);
  if (named) {
    const ref = resolveGraphEntityRef(graph, named);
    const node = ref.nodeId
      ? graph?.nodes.find((n) => n.id === ref.nodeId)
      : graph?.nodes.find((n) => n.visible && n.labelKo.includes(named));
    if (node) {
      return {
        labelKo: node.labelKo,
        nodeId: node.id,
        lat: node.lat,
        lng: node.lng,
      };
    }
    return { labelKo: named, nodeId: null, lat: null, lng: null };
  }

  const sel = resolveSelectionOrOrdinalRef(graph, text);
  if (sel?.nodeId) {
    const node = graph?.nodes.find((n) => n.id === sel.nodeId);
    if (node) {
      return {
        labelKo: node.labelKo,
        nodeId: node.id,
        lat: node.lat,
        lng: node.lng,
      };
    }
  }
  return null;
}

/**
 * Handle Navigate / Calendar when Graph Command OS has no IR.
 * Fail closed (null) when we cannot open maps or enqueue calendar prep.
 */
export function tryRunSoftSurfaceCommand(input: {
  utterance: string;
  graph?: SessionGraphV1 | null;
  contextEventId?: string | null;
  contextLabelKo?: string | null;
}): SoftCommandResult | null {
  const text = input.utterance.trim();
  if (!text) {
    return null;
  }
  const intent = classifyIntentFamily(text);
  const graph = input.graph ?? null;
  const contextEventId =
    input.contextEventId?.trim() || graph?.contextEventId?.trim() || "";

  if (intent === "Navigate") {
    const place = resolvePlaceNode(text, graph);
    if (place?.lat == null || place.lng == null) {
      return null;
    }
    const tool = invokeRimvioTool("maps.navigate", {
      lat: place.lat,
      lng: place.lng,
      placeName: place.labelKo,
      placeId: place.nodeId ?? undefined,
      utterance: text,
    });
    const mapsUrl = tool.mapsUrl?.trim() || null;
    if (!mapsUrl) {
      return null;
    }
    return {
      ok: true,
      kind: "navigate",
      assistantReplyKo: tool.summaryKo,
      mapsUrl,
    };
  }

  if (intent === "Calendar") {
    if (!contextEventId) {
      return null;
    }
    const place = resolvePlaceNode(text, graph);
    const label =
      place?.labelKo ??
      (graph?.nodes.find((n) => n.visible)?.labelKo ?? null);
    if (!label) {
      return null;
    }
    const tool = invokeRimvioTool("calendar.add", {
      contextEventId,
      contextLabelKo: input.contextLabelKo,
      placeName: label,
      placeId: place?.nodeId ?? undefined,
      utterance: text,
    });
    if (!tool.waitingCommit || !(tool.reservedOpIds?.length)) {
      return null;
    }
    return {
      ok: true,
      kind: "calendar",
      assistantReplyKo: tool.summaryKo,
      mapsUrl: null,
      reservedOpIds: tool.reservedOpIds,
      waitingCommit: true,
    };
  }

  return null;
}
