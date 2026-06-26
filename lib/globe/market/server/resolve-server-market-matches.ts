import { copy } from "@/lib/copy/human-ko";
import { resolveMarketAlignment } from "@/lib/globe/market/resolve-market-alignment";
import type { MarketAlignmentOffer } from "@/lib/globe/market/market-intent-types";
import { buildHandshakeOfferForViewer } from "@/lib/globe/market/server/build-handshake-offer";
import { listPendingHandshakesForUser } from "@/lib/globe/market/server/market-alignment-handshake-store";
import {
  listActiveMarketIntentsForMatching,
  listOwnMarketIntents,
  findMarketIntentById,
} from "@/lib/globe/market/server/upsert-market-intent";
import { scoreWeightedMarketAlignment } from "@/lib/globe/market/score-weighted-market-alignment";
import {
  findMarketHandshakeByIntentPair,
  upsertMarketHandshake,
} from "@/lib/globe/market/server/market-alignment-handshake-store";
import { scanMarketHandshakesForIntent } from "@/lib/globe/market/server/scan-market-handshakes";
import { isMarketIntentPublishedExternal } from "@/lib/globe/market/market-intent-detail";
import { getServerRegionalProfile } from "@/lib/preferences/server-regional-profile";
import type { RegionalProfile } from "@/lib/preferences/regional-profile";

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

async function ensureHandshakeForListingPair(input: {
  supabase: import("@supabase/supabase-js").SupabaseClient;
  userId: string;
  focusEventId: string;
  matchIntentId: string;
  regionalProfile: RegionalProfile;
}): Promise<MarketAlignmentOffer | null> {
  const own = await listOwnMarketIntents(input.supabase, input.userId);
  const seeking = own.find(
    (row) => row.eventId === input.focusEventId && row.role === "seeking",
  );
  if (!seeking) {
    return null;
  }

  const listing = await findMarketIntentById(input.supabase, input.matchIntentId);
  if (
    !listing?.active ||
    listing.role !== "listing" ||
    !listing.userId ||
    !isMarketIntentPublishedExternal(listing.detail)
  ) {
    return null;
  }

  const weighted = scoreWeightedMarketAlignment(seeking, listing);
  if (!weighted.passes) {
    return null;
  }

  const hint =
    weighted.topMatchedLabelsKo.length > 0
      ? `${weighted.topMatchedLabelsKo.join(" · ")} 맞음`
      : "";

  await upsertMarketHandshake(input.supabase, {
    seekingIntentId: seeking.id,
    listingIntentId: listing.id,
    seekingUserId: input.userId,
    listingUserId: listing.userId,
    alignmentScore: weighted.total,
    priorityHint: hint,
  });

  const handshake = await findMarketHandshakeByIntentPair(
    input.supabase,
    seeking.id,
    listing.id,
  );
  if (!handshake) {
    return null;
  }

  return buildHandshakeOfferForViewer({
    supabase: input.supabase,
    handshake,
    viewerUserId: input.userId,
    copy: HANDSHAKE_COPY,
    regionalProfile: input.regionalProfile,
  });
}

export async function resolveServerMarketAlignmentOffer(input: {
  supabase: import("@supabase/supabase-js").SupabaseClient;
  userId: string;
  focusEventId?: string | null;
  matchIntentId?: string | null;
}): Promise<MarketAlignmentOffer | null> {
  const focusEventId = input.focusEventId?.trim() || null;
  const matchIntentId = input.matchIntentId?.trim() || null;
  const regionalProfile = await getServerRegionalProfile();

  if (focusEventId && matchIntentId) {
    return ensureHandshakeForListingPair({
      supabase: input.supabase,
      userId: input.userId,
      focusEventId,
      matchIntentId,
      regionalProfile,
    });
  }

  const pending = await listPendingHandshakesForUser(input.supabase, input.userId);
  for (const handshake of pending) {
    const offer = await buildHandshakeOfferForViewer({
      supabase: input.supabase,
      handshake,
      viewerUserId: input.userId,
      copy: HANDSHAKE_COPY,
      regionalProfile,
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
          regionalProfile,
        });
        if (offer) {
          return offer;
        }
      }
    }
  }

  return resolveLiveMarketAlignmentOffer(input);
}
