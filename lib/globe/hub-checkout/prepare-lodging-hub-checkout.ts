import { buildContextLodgingBookingHandoff } from "@/lib/globe/context-action-injection/build-context-action-handoff";
import { resolveLodgingOfferCoverUrl } from "@/lib/globe/context-hub/providers/liteapi/attach-liteapi-room-offer-images";
import type { LodgingResourcePayload } from "@/lib/globe/context-hub/lodging-resource-types";
import type {
  HubLodgingCheckoutSession,
  LodgingCheckoutOfferWire,
} from "@/lib/globe/hub-checkout/types";

function newSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `hub-checkout-${Date.now().toString(36)}`;
}

export function prepareLodgingHubCheckout(input: {
  contextEventId: string;
  resourceId: string;
  payload: LodgingResourcePayload;
  offer: LodgingCheckoutOfferWire;
  offerImages?: readonly string[] | null;
}): HubLodgingCheckoutSession | null {
  const amountKrw = input.offer.totalPriceKrw ?? input.offer.priceKrw ?? input.payload.priceKrw;
  if (amountKrw == null || !Number.isFinite(amountKrw) || amountKrw <= 0) {
    return null;
  }

  const handoff = buildContextLodgingBookingHandoff({
    row: {
      name: input.payload.name,
      lat: 0,
      lng: 0,
      mapsUrl: input.payload.mapsUrl ?? null,
      priceKrw: amountKrw,
      checkInIso: input.payload.stayWindow?.checkInIso ?? null,
      checkOutIso: input.payload.stayWindow?.checkOutIso ?? null,
    },
    event: null,
    intent: {
      kind: "book_lodging",
      resourceKind: "lodging",
      confidence: 1,
    },
  });

  const liteapiOfferId = input.offer.providerOfferId?.trim() || null;
  const checkoutProvider =
    input.payload.provider === "liteapi" && liteapiOfferId ? "liteapi" : "rimvio_pg";

  return {
    sessionId: newSessionId(),
    hubId: "lodging",
    contextEventId: input.contextEventId.trim(),
    resourceId: input.resourceId.trim(),
    propertyName: input.payload.name.trim() || "숙소",
    checkInIso: input.payload.stayWindow?.checkInIso ?? "",
    checkOutIso: input.payload.stayWindow?.checkOutIso ?? "",
    offer: input.offer,
    handoffHref: handoff.href,
    amountKrw: Math.round(amountKrw),
    currency: "KRW",
    checkoutProvider,
    liteapiOfferId,
    coverImageUrl: resolveLodgingOfferCoverUrl({
      offer: { imageUrls: input.offerImages ?? undefined },
      propertyImages: input.payload.images,
    }),
    partnerLabel: input.payload.partnerLabel ?? null,
    refundable: input.offer.refundable,
  };
}
