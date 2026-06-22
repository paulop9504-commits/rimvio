import { marketCategoryLabelKo } from "@/lib/globe/market/market-category-registry";
import type { MarketHandshakeOffer, MarketHandshakeRecord } from "@/lib/globe/market/market-handshake-types";
import { findMarketIntentById } from "@/lib/globe/market/server/upsert-market-intent";
import { fetchPeerPublicProfileByUserId } from "@/lib/peer-chat/peer-public-profile";
import type { SupabaseClient } from "@supabase/supabase-js";

function formatPriceLine(
  priceMinKrw: number | null,
  priceMaxKrw: number | null,
): string {
  if (priceMinKrw === null && priceMaxKrw === null) {
    return "가격 협의";
  }
  if (priceMinKrw !== null && priceMaxKrw !== null) {
    if (priceMinKrw === priceMaxKrw) {
      return `${Math.round(priceMinKrw / 10_000)}만원`;
    }
    return `${Math.round(priceMinKrw / 10_000)}~${Math.round(priceMaxKrw / 10_000)}만원`;
  }
  if (priceMaxKrw !== null) {
    return `${Math.round(priceMaxKrw / 10_000)}만원 이하`;
  }
  return `${Math.round((priceMinKrw ?? 0) / 10_000)}만원 이상`;
}

export type HandshakeOfferCopy = {
  listingPendingHeadline: (title: string, place: string) => string;
  listingPendingBody: (category: string, hint: string) => string;
  listingPendingCta: string;
  buyerPreviewHeadline: (title: string, place: string) => string;
  buyerPreviewBody: (category: string, hint: string) => string;
  buyerPreviewCta: string;
};

export async function buildHandshakeOfferForViewer(input: {
  supabase: SupabaseClient;
  handshake: MarketHandshakeRecord;
  viewerUserId: string;
  copy: HandshakeOfferCopy;
}): Promise<MarketHandshakeOffer | null> {
  const { handshake, viewerUserId } = input;
  const isListing = viewerUserId === handshake.listingUserId;
  const isSeeking = viewerUserId === handshake.seekingUserId;
  if (!isListing && !isSeeking) {
    return null;
  }

  const listingIntent = await findMarketIntentById(
    input.supabase,
    handshake.listingIntentId,
  );
  const seekingIntent = await findMarketIntentById(
    input.supabase,
    handshake.seekingIntentId,
  );
  if (!listingIntent || !seekingIntent) {
    return null;
  }

  const matchIntent = isListing ? seekingIntent : listingIntent;
  const selfIntent = isListing ? listingIntent : seekingIntent;
  const otherUserId = isListing ? handshake.seekingUserId : handshake.listingUserId;
  const profile = await fetchPeerPublicProfileByUserId(input.supabase, otherUserId);
  const category = marketCategoryLabelKo(listingIntent.categoryId);
  const priceLine = formatPriceLine(listingIntent.priceMinKrw, listingIntent.priceMaxKrw);
  const hint = handshake.priorityHint.trim();

  if (handshake.phase === "pending_listing" && isListing) {
    return {
      selfIntentId: selfIntent.id,
      matchIntentId: matchIntent.id,
      selfEventId: selfIntent.eventId,
      matchEventId: matchIntent.eventId,
      role: "listing",
      headline: input.copy.listingPendingHeadline(
        seekingIntent.title,
        seekingIntent.placeLabel || "근처",
      ),
      body: input.copy.listingPendingBody(category, hint),
      ctaLabel: input.copy.listingPendingCta,
      matchLat: listingIntent.anchorLat,
      matchLng: listingIntent.anchorLng,
      matchPlaceLabel: listingIntent.placeLabel,
      distanceKm: 0,
      categoryId: listingIntent.categoryId,
      sourceRef: "market:alignment_v1.2",
      alignmentScore: handshake.alignmentScore ?? undefined,
      priorityHintKo: hint || undefined,
      matchUserId: handshake.seekingUserId,
      matchDisplayName: profile?.displayName ?? profile?.rimvioId ?? null,
      matchIntentServerId: matchIntent.id,
      selfIntentServerId: selfIntent.id,
      handshakeId: handshake.id,
      handshakePhase: handshake.phase,
      viewerAction: "accept_listing",
      threadId: handshake.threadId,
    };
  }

  if (handshake.phase === "pending_buyer_start" && isSeeking) {
    return {
      selfIntentId: selfIntent.id,
      matchIntentId: matchIntent.id,
      selfEventId: selfIntent.eventId,
      matchEventId: matchIntent.eventId,
      role: "seeking",
      headline: input.copy.buyerPreviewHeadline(
        listingIntent.title,
        listingIntent.placeLabel || "근처",
      ),
      body: input.copy.buyerPreviewBody(category, priceLine),
      ctaLabel: input.copy.buyerPreviewCta,
      matchLat: listingIntent.anchorLat,
      matchLng: listingIntent.anchorLng,
      matchPlaceLabel: listingIntent.placeLabel,
      distanceKm: 0,
      categoryId: listingIntent.categoryId,
      sourceRef: "market:alignment_v1.2",
      alignmentScore: handshake.alignmentScore ?? undefined,
      priorityHintKo: hint || undefined,
      matchUserId: handshake.listingUserId,
      matchDisplayName: profile?.displayName ?? profile?.rimvioId ?? null,
      matchIntentServerId: matchIntent.id,
      selfIntentServerId: selfIntent.id,
      handshakeId: handshake.id,
      handshakePhase: handshake.phase,
      viewerAction: "open_preview",
      threadId: handshake.threadId,
    };
  }

  if (handshake.phase === "active" && handshake.threadId) {
    return {
      selfIntentId: selfIntent.id,
      matchIntentId: matchIntent.id,
      selfEventId: selfIntent.eventId,
      matchEventId: matchIntent.eventId,
      role: selfIntent.role,
      headline: isSeeking
        ? input.copy.buyerPreviewHeadline(
            listingIntent.title,
            listingIntent.placeLabel || "근처",
          )
        : input.copy.listingPendingHeadline(
            seekingIntent.title,
            seekingIntent.placeLabel || "근처",
          ),
      body: input.copy.buyerPreviewBody(category, priceLine),
      ctaLabel: input.copy.buyerPreviewCta,
      matchLat: listingIntent.anchorLat,
      matchLng: listingIntent.anchorLng,
      matchPlaceLabel: listingIntent.placeLabel,
      distanceKm: 0,
      categoryId: listingIntent.categoryId,
      sourceRef: "market:alignment_v1.2",
      handshakeId: handshake.id,
      handshakePhase: handshake.phase,
      viewerAction: "open_chat",
      threadId: handshake.threadId,
      matchUserId: otherUserId,
      matchIntentServerId: matchIntent.id,
      selfIntentServerId: selfIntent.id,
    };
  }

  return null;
}
