import type { BookingLodgingCandidate } from "@/lib/jarvis-in-app-booking/resolve-booking-lodging";

export type InlineChatBookingDraftStatus =
  | "pending"
  | "prepared"
  | "failed"
  | "cancelled";

export type InlineChatBookingDraftWire = {
  readonly draftId: string;
  readonly placeQuery: string;
  readonly placeId: string;
  readonly placeName: string;
  readonly cityId: string;
  readonly lat: number;
  readonly lng: number;
  readonly amountLabel?: string | null;
  readonly contextEventId: string;
  readonly contextLabelKo?: string | null;
  readonly status: InlineChatBookingDraftStatus;
  readonly operationId?: string | null;
  readonly errorKo?: string | null;
  readonly disambiguation?: readonly BookingLodgingCandidate[];
};

export function buildInlineChatBookingDraftWire(input: {
  draftId: string;
  placeQuery: string;
  placeId: string;
  placeName: string;
  cityId: string;
  lat: number;
  lng: number;
  amountLabel?: string | null;
  contextEventId: string;
  contextLabelKo?: string | null;
  disambiguation?: readonly BookingLodgingCandidate[];
}): InlineChatBookingDraftWire {
  return {
    draftId: input.draftId,
    placeQuery: input.placeQuery.trim(),
    placeId: input.placeId.trim(),
    placeName: input.placeName.trim(),
    cityId: input.cityId.trim(),
    lat: input.lat,
    lng: input.lng,
    amountLabel: input.amountLabel?.trim() || null,
    contextEventId: input.contextEventId.trim(),
    contextLabelKo: input.contextLabelKo?.trim() || null,
    status: "pending",
    disambiguation: input.disambiguation?.length
      ? input.disambiguation
      : undefined,
  };
}

export function patchInlineChatBookingDraftWire(
  wire: InlineChatBookingDraftWire,
  patch: Partial<
    Pick<
      InlineChatBookingDraftWire,
      | "status"
      | "operationId"
      | "errorKo"
      | "placeId"
      | "placeName"
      | "lat"
      | "lng"
      | "amountLabel"
      | "disambiguation"
    >
  >,
): InlineChatBookingDraftWire {
  return { ...wire, ...patch };
}
