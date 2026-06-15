import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ContextHubKind } from "@/lib/globe/context-hub/context-hub-metadata";
import {
  listContextHubLinks,
  type ContextHubLink,
} from "@/lib/globe/context-hub/list-context-hub-links";
import { shouldOfferDepartureHub } from "@/lib/globe/should-offer-departure-hub";
import type { DepartureHubOption } from "@/lib/globe/suggest-departure-hub-options";
import { suggestDepartureHubOptions } from "@/lib/globe/suggest-departure-hub-options";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import { findPersonalGlobePinByEventId } from "@/lib/globe/personal-globe-pin-store";

/** Plug-in resource service — not a globe context. */
export type ContextHubServiceId = "flight" | "rental_car" | "ai_search";

export type ContextHubServiceDef = {
  id: ContextHubServiceId;
  /** Implemented storage kind on globe events. */
  kind: ContextHubKind | null;
  labelKo: string;
  shortLabelKo: string;
  implemented: boolean;
};

export const CONTEXT_HUB_SERVICE_CATALOG: readonly ContextHubServiceDef[] = [
  {
    id: "flight",
    kind: "departure_airport",
    labelKo: "항공",
    shortLabelKo: "항공",
    implemented: true,
  },
  {
    id: "rental_car",
    kind: null,
    labelKo: "렌트카",
    shortLabelKo: "렌트카",
    implemented: false,
  },
  {
    id: "ai_search",
    kind: null,
    labelKo: "AI 검색",
    shortLabelKo: "AI",
    implemented: false,
  },
] as const;

export type ContextHubServiceRow = {
  serviceId: ContextHubServiceId;
  labelKo: string;
  shortLabelKo: string;
  implemented: boolean;
  /** This context can use this hub service. */
  offered: boolean;
  connected: boolean;
  link: ContextHubLink | null;
  flightOptions: readonly DepartureHubOption[];
};

function resolveContextPlace(event: EventCandidate): string {
  const pin = findPersonalGlobePinByEventId(event.id);
  const plan = readPlanContextFromEvent(event);
  return (
    pin?.placeLabel?.trim() ||
    plan?.place?.trim() ||
    event.place?.trim() ||
    event.title.trim() ||
    "맥락"
  );
}

function isTravelContext(event: EventCandidate): boolean {
  if (event.category === "travel") {
    return true;
  }
  if (event.metadata?.feedPlanEnabled === true) {
    return true;
  }
  return shouldOfferDepartureHub(event);
}

function isServiceOffered(serviceId: ContextHubServiceId, event: EventCandidate): boolean {
  switch (serviceId) {
    case "flight":
      return shouldOfferDepartureHub(event);
    case "rental_car":
      return isTravelContext(event);
    case "ai_search":
      return true;
    default:
      return false;
  }
}

export type ContextHubServicesForEvent = {
  eventId: string;
  contextPlace: string;
  services: ContextHubServiceRow[];
};

/** Hub services for one selected context — never lists other contexts. */
export function listContextHubServicesForEvent(
  event: EventCandidate | null | undefined,
): ContextHubServicesForEvent | null {
  if (!event) {
    return null;
  }

  const place = resolveContextPlace(event);
  const flightOptions = shouldOfferDepartureHub(event)
    ? suggestDepartureHubOptions({ destinationPlace: place })
    : [];

  const services: ContextHubServiceRow[] = CONTEXT_HUB_SERVICE_CATALOG.map((def) => {
    const offered = isServiceOffered(def.id, event);
    const link =
      def.kind === "departure_airport"
        ? (listContextHubLinks(event).find((row) => row.kind === def.kind) ?? null)
        : null;

    return {
      serviceId: def.id,
      labelKo: def.labelKo,
      shortLabelKo: def.shortLabelKo,
      implemented: def.implemented,
      offered,
      connected: Boolean(link),
      link,
      flightOptions: def.id === "flight" ? flightOptions : [],
    };
  }).filter((row) => row.offered);

  if (services.length === 0) {
    return null;
  }

  return {
    eventId: event.id,
    contextPlace: place,
    services,
  };
}
