import { listContextHubServicesForEvent } from "@/lib/globe/context-hub/context-hub-service-catalog";
import type { PriorityStripPayload } from "@/lib/globe/priority-strip/types";
import { rankContextResources } from "@/lib/globe/resource/rank-context-resources";
import { offerTravelPaceLearnIfNeeded } from "@/lib/globe/travel/offer-travel-pace-learn";
import { shouldOfferTravelPaceLearn } from "@/lib/globe/travel/should-offer-travel-pace-learn";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { listPendingPersonaLearns } from "@/lib/persona/persona-pending-learn-store";
import type { WorkQueueItem } from "@/lib/work-queue";

function readQrSrc(resource: {
  action: { kind: string; href: string } | null;
  metadata?: Record<string, unknown>;
}): string | null {
  const meta = resource.metadata?.qrPreviewUrl;
  if (typeof meta === "string" && meta.trim()) {
    return meta.trim();
  }
  if (resource.action?.kind === "show_qr" && resource.action.href.trim()) {
    return resource.action.href.trim();
  }
  return null;
}

function buildMainActionCandidate(input: {
  event: EventCandidate;
  lat: number | null;
  lng: number | null;
}): PriorityStripPayload | null {
  const panel = listContextHubServicesForEvent(input.event);
  if (!panel) {
    return null;
  }
  const ranked = rankContextResources({
    event: input.event,
    services: panel.services,
    lat: input.lat,
    lng: input.lng,
  });
  const main = ranked[0];
  if (!main) {
    return null;
  }
  const action = main.resource.action;
  const isQr = action?.kind === "show_qr";
  const hasHref = Boolean(action?.href?.trim());
  const isTicketOrFlight =
    main.hubRow.serviceId === "ticket" || main.hubRow.serviceId === "flight";
  /** Only surface strong MAIN — not bare market plug-in noise. */
  const hasStrongAction =
    isQr ||
    hasHref ||
    (main.hubRow.connected && isTicketOrFlight);

  if (!hasStrongAction) {
    return null;
  }

  const titleKo =
    main.resource.shortLabel?.trim() ||
    main.resource.label.trim() ||
    main.hubRow.labelKo;
  const subtitleKo =
    main.resource.spacetime.placeLabel?.trim() ||
    input.event.place?.trim() ||
    null;

  return {
    kind: "main_action",
    id: `main-${main.resource.resourceId}`,
    titleKo,
    subtitleKo,
    ctaLabelKo: isQr
      ? "QR 열기"
      : action?.labelKo?.trim() || "지금 열기",
    actionKind: action?.kind ?? "open_hub",
    href: action?.href?.trim() || null,
    qrSrc: readQrSrc(main.resource),
    eventId: input.event.id,
    resourceId: main.resource.resourceId,
    autoExpand: isQr || isTicketOrFlight,
  };
}

export function buildPriorityCandidates(input: {
  event: EventCandidate | null;
  lat: number | null;
  lng: number | null;
  workQueue: readonly WorkQueueItem[];
  discoveryEventId?: string | null;
}): PriorityStripPayload[] {
  offerTravelPaceLearnIfNeeded({
    event: input.event,
    workQueue: input.workQueue,
    discoveryEventId: input.discoveryEventId,
  });

  const surfaceTravelPaceLearn = shouldOfferTravelPaceLearn({
    event: input.event,
    workQueue: input.workQueue,
    discoveryEventId: input.discoveryEventId,
  });

  const candidates: PriorityStripPayload[] = [];

  if (input.event) {
    const main = buildMainActionCandidate({
      event: input.event,
      lat: input.lat,
      lng: input.lng,
    });
    if (main) {
      candidates.push(main);
    }
  }

  for (const learn of listPendingPersonaLearns()) {
    if (learn.axisId === "travel.pace" && !surfaceTravelPaceLearn) {
      continue;
    }
    candidates.push({
      kind: learn.kind === "protect" ? "protect" : "help_learn",
      id: learn.id,
      titleKo: learn.titleKo,
      learn,
      autoExpand: learn.autoExpand ?? learn.kind === "protect",
    });
  }

  const firstQueue = input.workQueue[0];
  if (firstQueue) {
    candidates.push({
      kind: "queue",
      id: `queue-${firstQueue.id}`,
      titleKo: firstQueue.titleKo,
      subtitleKo: firstQueue.subtitleKo || null,
      queueItem: firstQueue,
      queueCount: input.workQueue.length,
      autoExpand: false,
    });
  }

  return candidates;
}
