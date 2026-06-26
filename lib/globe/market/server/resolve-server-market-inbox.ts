import { copy } from "@/lib/copy/human-ko";
import { buildHandshakeOfferForViewer } from "@/lib/globe/market/server/build-handshake-offer";
import { listPendingHandshakesForUser } from "@/lib/globe/market/server/market-alignment-handshake-store";
import type { MarketHandshakeOffer } from "@/lib/globe/market/market-handshake-types";
import { getServerRegionalProfile } from "@/lib/preferences/server-regional-profile";

const HANDSHAKE_COPY = {
  listingPendingHeadline: (title: string, place: string) =>
    copy.globe.marketHandshakeListingHeadline(title, place),
  listingPendingBody: (category: string, hint: string) =>
    copy.globe.marketHandshakeListingBody(category, hint),
  listingPendingCta: copy.globe.marketHandshakeListingCta,
  buyerPreviewHeadline: (title: string, place: string) =>
    copy.globe.marketHandshakeBuyerHeadline(title, place),
  buyerPreviewBody: (category: string, hint: string) =>
    copy.globe.marketHandshakeBuyerBody(category, hint),
  buyerPreviewCta: copy.globe.marketHandshakeBuyerCta,
};

/** Pending handshake offers for globe inbox projection. */
export async function resolveServerMarketInboxOffers(input: {
  supabase: import("@supabase/supabase-js").SupabaseClient;
  userId: string;
}): Promise<MarketHandshakeOffer[]> {
  const pending = await listPendingHandshakesForUser(input.supabase, input.userId);
  const regionalProfile = await getServerRegionalProfile();
  const offers: MarketHandshakeOffer[] = [];
  for (const handshake of pending) {
    const offer = await buildHandshakeOfferForViewer({
      supabase: input.supabase,
      handshake,
      viewerUserId: input.userId,
      copy: HANDSHAKE_COPY,
      regionalProfile,
    });
    if (offer?.handshakeId) {
      offers.push(offer);
    }
  }
  return offers.sort(
    (left, right) =>
      (right.alignmentScore ?? 0) - (left.alignmentScore ?? 0),
  );
}
