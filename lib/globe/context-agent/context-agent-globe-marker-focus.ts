import type { EventCandidate } from "@/lib/events/event-candidate";
import { copy } from "@/lib/copy/human-ko";
import { highlightGeoOntologyPlace } from "@/lib/globe/spatial-semantic/geo-ontology-graph-store";
import { readContextConditionLastBatch } from "@/lib/globe/context-condition-ai/context-condition-last-batch-store";
import { findContextConditionPinBatch } from "@/lib/globe/context-condition-ai/context-condition-batch-metadata";
import { parseContextConditionResourceId } from "@/lib/globe/context-agent/parse-context-condition-resource-id";
import { readLodgingInventoryRows } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { readEateryInventoryRows } from "@/lib/globe/eatery/read-eatery-resource-inventory";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import type { LocalDiscoveryActivitySubtype } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import { activitySubtypeChatActionHint } from "@/lib/globe/place/activity-subtype-presentation";

export type ContextAgentGlobeMarkerFocusDetail = {
  readonly contextEventId: string;
  readonly kind: "lodging" | "eatery" | "activity" | "amenity";
  readonly activitySubtype?: LocalDiscoveryActivitySubtype | null;
  readonly placeId: string;
  readonly title: string;
  readonly insightKo: string;
  /** Follow-up CTA line for activity subtypes (chat compose). */
  readonly actionHintKo?: string | null;
  readonly lat: number;
  readonly lng: number;
  readonly source: "map_marker";
};

const EVENT_NAME = "rimvio-context-agent-globe-marker-focus";

function isScoutPlaceId(
  event: EventCandidate,
  kind: "lodging" | "eatery" | "activity" | "amenity",
  placeId: string,
): boolean {
  const batch = readContextConditionLastBatch(event.id);
  if (batch?.recommendations?.some((row) => row.placeId === placeId && row.kind === kind)) {
    return true;
  }
  if (!batch?.batchId) {
    return false;
  }
  const meta = findContextConditionPinBatch(event, batch.batchId);
  if (!meta) {
    return false;
  }
  const ids = kind === "lodging" ? meta.lodgingPlaceIds : meta.eateryPlaceIds;
  return ids.includes(placeId);
}

export function buildContextAgentMarkerInsight(input: {
  title: string;
  kind: "lodging" | "eatery" | "activity" | "amenity";
  activitySubtype?: LocalDiscoveryActivitySubtype | null;
  reasonKo?: string | null;
  anchorPlaceName?: string | null;
}): string {
  const title = input.title.trim() || copy.globe.contextConditionPanelEyebrow;
  const reason = input.reasonKo?.trim();
  if (reason) {
    return copy.globe.cicadaAgentMarkerInsight(title, reason);
  }
  const area = input.anchorPlaceName?.trim() || "근처";
  return copy.globe.cicadaAgentMarkerInsightFallback(
    title,
    area,
    input.kind,
    input.activitySubtype ?? null,
  );
}

export function buildContextAgentMarkerActionHint(input: {
  kind: "lodging" | "eatery" | "activity" | "amenity";
  activitySubtype?: LocalDiscoveryActivitySubtype | null;
}): string | null {
  if (input.kind !== "activity") {
    return null;
  }
  return activitySubtypeChatActionHint(input.activitySubtype ?? "general");
}

export function buildContextAgentMarkerChatLines(input: {
  title: string;
  kind: "lodging" | "eatery" | "activity" | "amenity";
  activitySubtype?: LocalDiscoveryActivitySubtype | null;
  reasonKo?: string | null;
  anchorPlaceName?: string | null;
}): { insightKo: string; actionHintKo: string | null } {
  return {
    insightKo: buildContextAgentMarkerInsight(input),
    actionHintKo: buildContextAgentMarkerActionHint(input),
  };
}

/** Globe marker tap → chat insight (context-switching). */
export function resolveContextAgentGlobeMarkerFocus(input: {
  resourceId: string;
  anchorPlaceName?: string | null;
}): ContextAgentGlobeMarkerFocusDetail | null {
  const parsed = parseContextConditionResourceId(input.resourceId);
  if (!parsed) {
    return null;
  }
  const event = findLifeEventCandidate(parsed.contextEventId);
  if (!event || !isScoutPlaceId(event, parsed.kind, parsed.placeId)) {
    return null;
  }

  const batch = readContextConditionLastBatch(event.id);
  const recommendation = batch?.recommendations?.find(
    (row) => row.placeId === parsed.placeId && row.kind === parsed.kind,
  );

  if (parsed.kind === "lodging") {
    const row = readLodgingInventoryRows(event).find((entry) => entry.placeId === parsed.placeId);
    if (!row) {
      return null;
    }
    const title = row.name?.trim() || recommendation?.title || parsed.placeId;
    const chat = buildContextAgentMarkerChatLines({
      title,
      kind: "lodging",
      activitySubtype: null,
      reasonKo: recommendation?.reasonKo,
      anchorPlaceName: input.anchorPlaceName,
    });
    return {
      contextEventId: parsed.contextEventId,
      kind: "lodging",
      activitySubtype: null,
      placeId: parsed.placeId,
      title,
      insightKo: chat.insightKo,
      actionHintKo: chat.actionHintKo,
      lat: row.lat,
      lng: row.lng,
      source: "map_marker",
    };
  }

  const row = readEateryInventoryRows(event).find((entry) => entry.placeId === parsed.placeId);
  if (!row) {
    return null;
  }
  const activitySubtype =
    parsed.kind === "activity"
      ? (recommendation?.activitySubtype ??
        batch?.spec?.activitySubtype ??
        null)
      : null;
  const title = row.name?.trim() || recommendation?.title || parsed.placeId;
  const chat = buildContextAgentMarkerChatLines({
    title,
    kind: parsed.kind,
    activitySubtype,
    reasonKo: recommendation?.reasonKo,
    anchorPlaceName: input.anchorPlaceName,
  });
  return {
    contextEventId: parsed.contextEventId,
    kind: parsed.kind,
    activitySubtype,
    placeId: parsed.placeId,
    title,
    insightKo: chat.insightKo,
    actionHintKo: chat.actionHintKo,
    lat: row.lat,
    lng: row.lng,
    source: "map_marker",
  };
}

export function publishContextAgentGlobeMarkerFocus(
  detail: ContextAgentGlobeMarkerFocusDetail,
): void {
  if (typeof window === "undefined") {
    return;
  }
  highlightGeoOntologyPlace({
    contextEventId: detail.contextEventId,
    placeId: detail.placeId,
  });
  window.dispatchEvent(
    new CustomEvent<ContextAgentGlobeMarkerFocusDetail>(EVENT_NAME, { detail }),
  );
}

export function subscribeContextAgentGlobeMarkerFocus(
  listener: (detail: ContextAgentGlobeMarkerFocusDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    listener((event as CustomEvent<ContextAgentGlobeMarkerFocusDetail>).detail);
  };
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
