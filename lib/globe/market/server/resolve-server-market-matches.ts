import { copy } from "@/lib/copy/human-ko";
import { resolveMarketAlignment } from "@/lib/globe/market/resolve-market-alignment";
import type { MarketAlignmentOffer } from "@/lib/globe/market/market-intent-types";
import { buildHandshakeOfferForViewer } from "@/lib/globe/market/server/build-handshake-offer";
import { listPendingHandshakesForUser } from "@/lib/globe/market/server/market-alignment-handshake-store";
import {
  listActiveMarketIntentsForMatching,
  listOwnMarketIntents,
} from "@/lib/globe/market/server/upsert-market-intent";
import { scanMarketHandshakesForIntent } from "@/lib/globe/market/server/scan-market-handshakes";

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

const LIVE_COPY = {
  headlineSeeking: copy.globe.marketAlignHeadlineSeeking,
  headlineListing: copy.globe.marketAlignHeadlineListing,
  body: copy.globe.marketAlignBody,
  cta: copy.globe.marketAlignCta,
};

function enrichLiveOffer(
  offer: MarketAlignmentOffer,
  pool: Awaited<ReturnType<typeof listOwnMarketIntents>>,
): MarketAlignmentOffer {
  const self = pool.find((row) => row.eventId === offer.selfEventId);
  const match = pool.find((row) => row.id === offer.matchIntentId);
  return {
    ...offer,
    selfIntentServerId: self?.id ?? null,
    matchIntentServerId: match?.id ?? null,
    matchUserId: match?.userId ?? null,
  };
}

async function resolveLiveMarketAlignmentOffer(input: {
  supabase: import("@supabase/supabase-js").SupabaseClient;
  userId: string;
  focusEventId?: string | null;
}): Promise<MarketAlignmentOffer | null> {
  const own = await listOwnMarketIntents(input.supabase, input.userId);
  if (own.length === 0) {
    return null;
  }

  const others = await listActiveMarketIntentsForMatching(input.supabase, {
    excludeUserId: input.userId,
    limit: 150,
  });
  const pool = [...own, ...others];
  const offer = resolveMarketAlignment({
    intents: pool,
    focusEventId: input.focusEventId,
    copy: LIVE_COPY,
  });
  if (!offer) {
    return null;
  }
  return enrichLiveOffer(offer, pool);
}

export async function resolveServerMarketAlignmentOffer(input: {
  supabase: import("@supabase/supabase-js").SupabaseClient;
  userId: string;
  focusEventId?: string | null;
}): Promise<MarketAlignmentOffer | null> {
  const focusEventId = input.focusEventId?.trim() || null;

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

  if (focusEventId) {
    const own = await listOwnMarketIntents(input.supabase, input.userId);
    const focus = own.find((row) => row.eventId === focusEventId);
    if (focus) {
      try {
        await scanMarketHandshakesForIntent(input.supabase, {
          ...focus,
          userId: input.userId,
        });
      } catch {
        // best-effort rescan when opening matches for a just-confirmed intent
      }

      const pendingAfterScan = await listPendingHandshakesForUser(
        input.supabase,
        input.userId,
      );
      for (const handshake of pendingAfterScan) {
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
    }
  }

  return resolveLiveMarketAlignmentOffer(input);
}
