import { copy } from "@/lib/copy/human-ko";
import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import { buildLodgingStayWindow } from "@/lib/globe/context-hub/lodging-stay-window";
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

/** External booking handoff — pinned lodging row → checkout entry URL. */
export function buildContextLodgingBookingHandoff(input: {
  row: Pick<
    ContextLodgingInventoryRow,
    "name" | "lat" | "lng" | "mapsUrl" | "priceKrw" | "checkInIso" | "checkOutIso"
  >;
  event?: EventCandidate | null;
  intent: ContextActionIntent;
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
  const mapsUrl = input.row.mapsUrl?.trim();

  if (mapsUrl) {
    return {
      actionTypeId: "field.lodging_book",
      labelKo:
        input.intent.kind === "pay_lodging"
          ? copy.globe.contextActionInjectPayLodging
          : copy.globe.contextActionInjectBookLodging,
      href: mapsUrl,
      internalRoute: false,
    };
  }

  const query = [name, checkIn ? `check in ${checkIn}` : null, checkOut ? `check out ${checkOut}` : null]
    .filter(Boolean)
    .join(" ");
  return {
    actionTypeId: "field.lodging_book",
    labelKo:
      input.intent.kind === "pay_lodging"
        ? copy.globe.contextActionInjectPayLodging
        : copy.globe.contextActionInjectBookLodging,
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
