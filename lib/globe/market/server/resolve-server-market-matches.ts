import { copy } from "@/lib/copy/human-ko";
import { buildHandshakeOfferForViewer } from "@/lib/globe/market/server/build-handshake-offer";
import { listPendingHandshakesForUser } from "@/lib/globe/market/server/market-alignment-handshake-store";
import type { MarketHandshakeOffer } from "@/lib/globe/market/market-handshake-types";

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

export async function resolveServerMarketAlignmentOffer(input: {
  supabase: import("@supabase/supabase-js").SupabaseClient;
  userId: string;
  focusEventId?: string | null;
}): Promise<MarketHandshakeOffer | null> {
  void input.focusEventId;
  const pending = await listPendingHandshakesForUser(input.supabase, input.userId);
  for (const handshake of pending) {
    const offer = await buildHandshakeOfferForViewer({
      supabase: input.supabase,
      handshake,
      viewerUserId: input.userId,
      copy: HANDSHAKE_COPY,
    });
    if (offer) {
      return offer;
    }
  }
  return null;
}
