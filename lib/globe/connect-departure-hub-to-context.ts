import type { EventCandidate } from "@/lib/events/event-candidate";
import { findEventCandidate } from "@/lib/events/event-store";
import {
  CONTEXT_HUB_KIND_META_KEY,
  CONTEXT_HUB_PARENT_EVENT_ID_META_KEY,
  mergeContextHubIds,
  readContextHubIds,
} from "@/lib/globe/context-hub/context-hub-metadata";
import { disconnectContextHub } from "@/lib/globe/context-hub/disconnect-context-hub";
import { findContextHubLinkByKind } from "@/lib/globe/context-hub/list-context-hub-links";
import { createPersonalGlobePinFromEvent } from "@/lib/globe/create-personal-globe-pin";
import {
  DEPARTURE_HUB_PROJECTION_KIND,
  DEPARTURE_HUB_AIRPORT_IATA_META_KEY,
  PIN_PROJECTION_KIND_META_KEY,
  getDepartureHubAirport,
  type DepartureHubAirportId,
} from "@/lib/globe/departure-hub-airports";
import type { PersonalGlobePin } from "@/lib/globe/personal-globe-pin-types";
import {
  LINKED_EVENT_ID_META_KEY,
  TRIP_LEG_META_KEY,
  TRIP_REF_META_KEY,
} from "@/lib/globe/trip-leg-metadata";
import { emitCommittedContextResource } from "@/lib/globe/resource/emit-committed-context-resource";
import { createReserveAction } from "@/lib/globe/resource/hub-action-record";
import { emitHubActionRecord } from "@/lib/globe/resource/hub-action-record-store";
import type { ContextResource } from "@/lib/globe/resource/types";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

function buildFlightResource(input: {
  destination: EventCandidate;
  airport: ReturnType<typeof getDepartureHubAirport>;
  departWhen: string;
}): ContextResource {
  const stamp = new Date().toISOString();
  return {
    resourceId: `${input.destination.id}:flight:${input.airport.id}`,
    contextEventId: input.destination.id,
    kind: "flight",
    sourceHubId: "flight",
    label: `${input.airport.shortLabelKo} · 출발`,
    shortLabel: input.airport.iata,
    spacetime: {
      lat: input.airport.lat,
      lng: input.airport.lng,
      placeLabel: input.airport.labelKo,
      validFromIso: input.departWhen,
      validUntilIso: null,
    },
    action: {
      kind: "navigate",
      href: `rimvio://hub/flight/${input.airport.id}`,
      labelKo: "출발",
    },
    createdAtIso: stamp,
    updatedAtIso: stamp,
    metadata: {
      airportId: input.airport.id,
      iata: input.airport.iata,
      committed: true,
    },
  };
}

function emitFlightConnectArtifacts(input: {
  destination: EventCandidate;
  airport: ReturnType<typeof getDepartureHubAirport>;
  departWhen: string;
}): EventCandidate {
  const resource = buildFlightResource(input);
  const destination = emitCommittedContextResource({
    contextEventId: input.destination.id,
    resource,
  });
  void emitHubActionRecord(
    createReserveAction({
      contextEventId: destination.id,
      resourceId: resource.resourceId,
      sourceHubId: "hub.flight",
      approvalPolicy: "user_tap",
      status: "success",
      externalRef: input.airport.iata,
      payload: {
        slot: {
          start: input.departWhen.slice(0, 10),
          end: input.departWhen.slice(0, 10),
        },
      },
    }),
  );
  return destination;
}

export type ConnectDepartureHubResult = {
  destinationEvent: EventCandidate;
  departureEvent: EventCandidate;
  departurePin: PersonalGlobePin;
};

function buildTripRef(destinationEventId: string): string {
  return `trip:${destinationEventId}`;
}

function departureEventId(tripRef: string, airportId: DepartureHubAirportId): string {
  return `trip-hub:${tripRef}:${airportId}`;
}

/** Plug a departure airport hub into a context — replaces prior departure hub if any. */
export function connectDepartureHubToContext(input: {
  destinationEventId: string;
  airportId: DepartureHubAirportId;
  homeRegionHint?: string | null;
}): ConnectDepartureHubResult {
  const destination = findEventCandidate(input.destinationEventId);
  if (!destination) {
    throw new Error("destination_event_not_found");
  }

  const existingDeparture = findContextHubLinkByKind(destination, "departure_airport");
  if (existingDeparture && existingDeparture.eventId) {
    const existingAirportId = existingDeparture.airportIata?.toLowerCase();
    if (existingAirportId === input.airportId) {
      const hubEvent = findEventCandidate(existingDeparture.eventId);
      if (hubEvent) {
        const airport = getDepartureHubAirport(input.airportId);
        const departWhen =
          hubEvent.datetime?.trim() ||
          destination.datetime?.trim() ||
          new Date().toISOString();
        const destinationEvent = emitFlightConnectArtifacts({
          destination,
          airport,
          departWhen,
        });
        const pin = createPersonalGlobePinFromEvent({
          event: hubEvent,
          experienceTitle: `${existingDeparture.shortLabel} · 출발`,
        }).pin;
        return {
          destinationEvent,
          departureEvent: hubEvent,
          departurePin: pin,
        };
      }
    }
    disconnectContextHub({
      contextEventId: destination.id,
      hubEventId: existingDeparture.eventId,
    });
  }

  const refreshedDestination = findEventCandidate(destination.id) ?? destination;
  const airport = getDepartureHubAirport(input.airportId);
  const tripRef = buildTripRef(refreshedDestination.id);
  const departId = departureEventId(tripRef, airport.id);
  const plan = readPlanContextFromEvent(refreshedDestination);
  const stamp = new Date().toISOString();
  const departWhen =
    plan?.windowStartIso?.trim() ||
    refreshedDestination.datetime?.trim() ||
    stamp;

  const departureEvent = commitEventUpsert({
    id: departId,
    title: `${airport.shortLabelKo} · 출발`,
    category: "travel",
    source: "manual",
    lifecycle: refreshedDestination.lifecycle,
    datetime: departWhen,
    place: airport.labelKo,
    confidence: 0.92,
    metadata: {
      feedPlanEnabled: true,
      planKind: "plan",
      targetingSource: "departure_hub",
      globeManualContext: true,
      globePlaceConfirmed: true,
      globePlaceLat: airport.lat,
      globePlaceLng: airport.lng,
      globePlaceLabel: airport.labelKo,
      globePlaceCardLat: airport.lat,
      globePlaceCardLng: airport.lng,
      globePlaceCardLabel: airport.labelKo,
      [TRIP_REF_META_KEY]: tripRef,
      [TRIP_LEG_META_KEY]: "departure",
      [LINKED_EVENT_ID_META_KEY]: refreshedDestination.id,
      [PIN_PROJECTION_KIND_META_KEY]: DEPARTURE_HUB_PROJECTION_KIND,
      [DEPARTURE_HUB_AIRPORT_IATA_META_KEY]: airport.iata,
      [CONTEXT_HUB_KIND_META_KEY]: "departure_airport",
      [CONTEXT_HUB_PARENT_EVENT_ID_META_KEY]: refreshedDestination.id,
      departureHubHomeHint: input.homeRegionHint?.trim() || null,
      departureHubDestinationEventId: refreshedDestination.id,
    },
    lifecycleUpdatedAt: stamp,
  });

  const hubIds = mergeContextHubIds(readContextHubIds(refreshedDestination), departureEvent.id);

  const destinationEvent = commitEventUpsert({
    ...refreshedDestination,
    metadata: {
      ...(refreshedDestination.metadata ?? {}),
      contextHubIds: hubIds,
      contextHubUpdatedAtIso: stamp,
      [TRIP_REF_META_KEY]: tripRef,
      [TRIP_LEG_META_KEY]: "destination",
      [LINKED_EVENT_ID_META_KEY]: departureEvent.id,
      departureHubAirportIata: airport.iata,
      departureHubConnectedAtIso: stamp,
    },
    lifecycleUpdatedAt: stamp,
  });

  const { pin: departurePin } = createPersonalGlobePinFromEvent({
    event: departureEvent,
    experienceTitle: `${airport.shortLabelKo} · 출발`,
  });

  createPersonalGlobePinFromEvent({
    event: destinationEvent,
    experienceTitle: destinationEvent.title,
  });

  const withFlight = emitFlightConnectArtifacts({
    destination: destinationEvent,
    airport,
    departWhen,
  });

  return {
    destinationEvent: withFlight,
    departureEvent,
    departurePin,
  };
}
