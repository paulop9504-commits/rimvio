import { copy } from "@/lib/copy/human-ko";
import type { LocalDiscoveryLodgingKind } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import { buildLodgingStayWindow } from "@/lib/globe/context-hub/lodging-stay-window";
import { buildAirbnbLodgingSearchUrl } from "@/lib/globe/context-hub/providers/airbnb";
import { resolveLodgingBookingProvider } from "@/lib/globe/context-hub/resolve-lodging-booking-provider";
import type { ContextEateryInventoryRow } from "@/lib/globe/eatery/eatery-resource-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type {
  ContextActionInjectedButton,
  ContextActionIntent,
} from "@/lib/globe/context-action-injection/types";

function formatPriceKrw(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  return `1박 ${value.toLocaleString("ko-KR")}원`;
}

function ymdFromIso(iso: string | null | undefined): string | null {
  if (!iso?.trim()) {
    return null;
  }
  const date = iso.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

/** In-app Hub checkout — pinned lodging with derived room offers. */
export function buildContextLodgingHubCheckoutHandoff(input: {
  intent: ContextActionIntent;
}): ContextActionInjectedButton {
  return {
    actionTypeId: "hub.lodging_checkout",
    labelKo:
      input.intent.kind === "pay_lodging"
        ? copy.globe.contextActionInjectPayLodging
        : copy.globe.contextActionInjectBookLodging,
    href: "rimvio://hub/lodging-checkout",
    internalRoute: true,
  };
}

/** External booking handoff — pinned lodging row → checkout entry URL. */
export function buildContextLodgingBookingHandoff(input: {
  row: Pick<
    ContextLodgingInventoryRow,
    "name" | "lat" | "lng" | "mapsUrl" | "priceKrw" | "checkInIso" | "checkOutIso"
  >;
  event?: EventCandidate | null;
  intent: ContextActionIntent;
  lodgingKind?: LocalDiscoveryLodgingKind | null;
  contextEventId?: string | null;
  guestCount?: number | null;
}): ContextActionInjectedButton {
  const stayWindow =
    input.event != null
      ? buildLodgingStayWindow({ event: input.event, row: input.row })
      : null;
  const checkIn =
    ymdFromIso(input.row.checkInIso) ?? ymdFromIso(stayWindow?.checkInIso);
  const checkOut =
    ymdFromIso(input.row.checkOutIso) ?? ymdFromIso(stayWindow?.checkOutIso);
  const name = input.row.name.trim() || "숙소";
  const bookingProvider = resolveLodgingBookingProvider({
    lodgingKind: input.lodgingKind,
    contextEventId: input.contextEventId ?? input.event?.id ?? null,
  });
  const labelKo =
    input.intent.kind === "pay_lodging"
      ? copy.globe.contextActionInjectPayLodging
      : bookingProvider === "airbnb"
        ? copy.globe.contextActionInjectBookLodgingAirbnb
        : copy.globe.contextActionInjectBookLodging;

  if (bookingProvider === "airbnb") {
    return {
      actionTypeId: "field.lodging_book_airbnb",
      labelKo,
      href: buildAirbnbLodgingSearchUrl({
        query: name,
        checkInYmd: checkIn,
        checkOutYmd: checkOut,
        adults: input.guestCount ?? 1,
        lat: input.row.lat,
        lng: input.row.lng,
      }),
      internalRoute: false,
    };
  }

  // Book = hotel search with this property name (+ dates), never raw Maps place URL.
  // Maps is navigation; 예매 must match a booking/search intent.
  const query = [name, checkIn ? `check in ${checkIn}` : null, checkOut ? `check out ${checkOut}` : null]
    .filter(Boolean)
    .join(" ");
  return {
    actionTypeId: "field.lodging_book",
    labelKo,
    href: `https://www.google.com/travel/hotels?q=${encodeURIComponent(query)}`,
    internalRoute: false,
  };
}

export function buildContextEateryBookingHandoff(input: {
  row: Pick<ContextEateryInventoryRow, "name" | "mapsUrl">;
  intent: ContextActionIntent;
}): ContextActionInjectedButton {
  const mapsUrl = input.row.mapsUrl?.trim();
  const name = input.row.name.trim() || "식당";
  return {
    actionTypeId: "field.eatery_reserve",
    labelKo:
      input.intent.kind === "pay_eatery"
        ? copy.globe.contextActionInjectPayEatery
        : copy.globe.contextActionInjectBookEatery,
    href:
      mapsUrl ??
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`,
    internalRoute: false,
  };
}

export function formatContextActionTargetPriceLine(input: {
  kind: "lodging" | "eatery";
  priceKrw?: number | null;
}): string | null {
  if (input.kind !== "lodging") {
    return null;
  }
  return formatPriceKrw(input.priceKrw);
}
