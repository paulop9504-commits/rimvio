import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import type { MarketHandshakeRecord } from "@/lib/globe/market/market-handshake-types";
import {
  computeMarketTradeHostEta,
  formatMarketTradeHostEtaLabel,
} from "@/lib/globe/market/compute-market-trade-host-eta";
import { readMarketAvailabilityPreset } from "@/lib/globe/market/market-availability-preset";
import type { MarketTradeSessionRecord, MarketTradeSessionView } from "@/lib/globe/market/market-trade-types";
import {
  formatMarketTradeDateLabelKo,
  generateMarketTradeTimeSlotsForDate,
} from "@/lib/globe/market/market-trade-schedule";
import {
  buildMarketTradeProgressSteps,
  formatMarketTradeCountdownLabel,
  formatMarketTradeMeetAtLabel,
  resolveMarketTradeActiveStep,
} from "@/lib/globe/market/resolve-market-trade-progress";
import { formatMarketTradeSchedulingCountdown } from "@/lib/globe/market/resolve-market-trade-scheduling";
import { copy } from "@/lib/copy/human-ko";

export type MarketTradeSessionCopy = {
  roleBadgeSeeking: string;
  roleBadgeListing: string;
  statusSchedulingListing: string;
  statusSchedulingListingSub: string;
  statusSchedulingSeeking: string;
  statusBuyerPickedDayListing: string;
  statusBuyerPickedDayListingSub: (label: string) => string;
  statusBuyerPickedDaySeeking: string;
  statusSellerProposedSeeking: string;
  statusSellerProposedSeekingSub: string;
  statusSellerProposedListing: string;
  statusExpired: string;
  statusConfirmedSeeking: string;
  statusConfirmedSeekingSub: (countdown: string) => string;
  statusBeforeDeparture: string;
  statusMeeting: string;
  statusCompleted: string;
  stepConfirmed: string;
  stepBeforeDeparture: string;
  stepMeeting: string;
  stepDone: string;
  priceOpen: string;
  statusEnRouteSeeking: string;
  statusEnRouteListing: string;
  hostGuestEtaArrived: string;
  hostGuestEtaLine: (minutes: number, distanceKm: number) => string;
  hostGuestEtaStale: string;
  statusSchedulingSeekingSub: string;
  handshakeCompleteSeekingCta: string;
  handshakeCompleteListingCta: string;
  handshakeAwaitingOtherParty: string;
};

function formatPriceLine(
  priceMin: number | null,
  priceMax: number | null,
  priceOpen: string,
): string {
  if (priceMin !== null && priceMax !== null && priceMin === priceMax) {
    return `${priceMin.toLocaleString("ko-KR")}원`;
  }
  if (priceMax !== null) {
    return `${Math.round(priceMax / 10_000)}만원 이하`;
  }
  if (priceMin !== null) {
    return `${Math.round(priceMin / 10_000)}만원 이상`;
  }
  return priceOpen;
}

function readViewerHandshakeConfirmed(
  record: Pick<
    MarketTradeSessionRecord,
    "viewerRole" | "seekingConfirmedAtIso" | "listingConfirmedAtIso"
  >,
): boolean {
  if (record.viewerRole === "seeking") {
    return Boolean(record.seekingConfirmedAtIso);
  }
  if (record.viewerRole === "listing") {
    return Boolean(record.listingConfirmedAtIso);
  }
  return false;
}

function readOtherHandshakeConfirmed(
  record: Pick<
    MarketTradeSessionRecord,
    "viewerRole" | "seekingConfirmedAtIso" | "listingConfirmedAtIso"
  >,
): boolean {
  if (record.viewerRole === "seeking") {
    return Boolean(record.listingConfirmedAtIso);
  }
  if (record.viewerRole === "listing") {
    return Boolean(record.seekingConfirmedAtIso);
  }
  return false;
}

function canShowHandshakeComplete(record: MarketTradeSessionRecord): boolean {
  return (
    record.phase === "active" &&
    (record.tradeStatus === "confirmed" ||
      record.tradeStatus === "en_route" ||
      record.tradeStatus === "meeting") &&
    Boolean(record.meetAtIso)
  );
}

export function buildMarketTradeSessionRecord(input: {
  handshake: MarketHandshakeRecord;
  listing: MarketIntentRecord;
  viewerUserId: string;
}): MarketTradeSessionRecord | null {
  const { handshake, listing, viewerUserId } = input;
  const viewerRole =
    viewerUserId === handshake.seekingUserId
      ? "seeking"
      : viewerUserId === handshake.listingUserId
        ? "listing"
        : null;
  if (!viewerRole) {
    return null;
  }

  const photoUrl = listing.detail.photoUrls?.[0] ?? null;

  return {
    handshakeId: handshake.id,
    threadId: handshake.threadId,
    phase: handshake.phase,
    tradeStatus: handshake.tradeStatus,
    meetMode: handshake.meetMode,
    listingIntentId: handshake.listingIntentId,
    seekingIntentId: handshake.seekingIntentId,
    meetAtIso: handshake.meetAtIso,
    meetPlaceLabel: handshake.meetPlaceLabel,
    meetLat: handshake.meetLat,
    meetLng: handshake.meetLng,
    guestShareLocation: handshake.guestShareLocation,
    guestLat: handshake.guestLat,
    guestLng: handshake.guestLng,
    guestLocationAtIso: handshake.guestLocationAtIso,
    scheduleCandidates: handshake.scheduleCandidates,
    preferredMeetDateKey: handshake.preferredMeetDateKey,
    preferredMeetAtIso: handshake.preferredMeetAtIso,
    schedulingExpiresAtIso: handshake.schedulingExpiresAtIso,
    availabilityPreset: readMarketAvailabilityPreset(listing.detail?.availabilityPreset),
    seekingConfirmedAtIso: handshake.seekingConfirmedAtIso,
    listingConfirmedAtIso: handshake.listingConfirmedAtIso,
    viewerRole,
    productTitle: listing.detail.productName.trim() || listing.title.trim(),
    priceLine: formatPriceLine(
      listing.priceMinKrw,
      listing.priceMaxKrw,
      "가격 협의",
    ),
    photoUrl,
    updatedAtIso: handshake.updatedAtIso,
  };
}

export function buildMarketTradeSessionView(
  record: MarketTradeSessionRecord,
  sessionCopy: MarketTradeSessionCopy,
  now = new Date(),
): MarketTradeSessionView {
  const activeStepId = resolveMarketTradeActiveStep({
    tradeStatus: record.tradeStatus,
    meetAtIso: record.meetAtIso,
    meetLat: record.meetLat,
    meetLng: record.meetLng,
    guestLat: record.guestLat,
    guestLng: record.guestLng,
    guestLocationAtIso: record.guestLocationAtIso,
    now,
  });

  const progressSteps = buildMarketTradeProgressSteps({
    activeStepId,
    labels: {
      confirmed: sessionCopy.stepConfirmed,
      beforeDeparture: sessionCopy.stepBeforeDeparture,
      meeting: sessionCopy.stepMeeting,
      done: sessionCopy.stepDone,
    },
  });

  const roleBadgeKo =
    record.viewerRole === "seeking"
      ? sessionCopy.roleBadgeSeeking
      : sessionCopy.roleBadgeListing;

  let statusHeadlineKo = sessionCopy.statusSchedulingSeeking;
  let statusSublineKo: string | null = null;
  let proposalLineKo: string | null = null;
  let countdownLabelKo: string | null = null;
  let meetAtLabelKo: string | null = null;
  const meetPlaceDisplay = record.meetPlaceLabel?.trim() || null;
  const schedulingCountdownKo = formatMarketTradeSchedulingCountdown(
    record.schedulingExpiresAtIso,
    now,
  );

  if (record.tradeStatus === "scheduling") {
    if (record.viewerRole === "listing") {
      statusHeadlineKo = sessionCopy.statusSchedulingListing;
      statusSublineKo = sessionCopy.statusSchedulingListingSub;
    } else {
      statusHeadlineKo = sessionCopy.statusSchedulingSeeking;
      statusSublineKo = sessionCopy.statusSchedulingSeekingSub;
      if (schedulingCountdownKo) {
        statusSublineKo = `${sessionCopy.statusSchedulingSeekingSub} · ${schedulingCountdownKo}`;
      }
    }
  } else if (record.tradeStatus === "buyer_picked_day") {
    const dayLabel = record.preferredMeetDateKey
      ? formatMarketTradeDateLabelKo(record.preferredMeetDateKey, now)
      : null;
    if (record.viewerRole === "listing") {
      statusHeadlineKo = sessionCopy.statusBuyerPickedDayListing;
      statusSublineKo = dayLabel
        ? sessionCopy.statusBuyerPickedDayListingSub(dayLabel)
        : sessionCopy.statusSchedulingListingSub;
    } else {
      statusHeadlineKo = sessionCopy.statusBuyerPickedDaySeeking;
      statusSublineKo = dayLabel
        ? `${dayLabel} · ${copy.globe.marketTradeBuyerPickedDaySeekingSub}`
        : copy.globe.marketTradeBuyerPickedDaySeekingSub;
    }
  } else if (record.tradeStatus === "seller_proposed") {
    if (record.meetAtIso) {
      meetAtLabelKo = formatMarketTradeMeetAtLabel(record.meetAtIso, now);
    }
    if (record.viewerRole === "seeking") {
      statusHeadlineKo = sessionCopy.statusSellerProposedSeeking;
      statusSublineKo = sessionCopy.statusSellerProposedSeekingSub;
    } else {
      statusHeadlineKo = sessionCopy.statusSellerProposedListing;
      statusSublineKo = copy.globe.marketTradeSellerProposedListingSub;
    }
  } else if (record.tradeStatus === "expired") {
    statusHeadlineKo = sessionCopy.statusExpired;
  } else if (record.tradeStatus === "completed") {
    statusHeadlineKo = sessionCopy.statusCompleted;
  } else if (record.tradeStatus === "en_route") {
    statusHeadlineKo =
      record.viewerRole === "seeking"
        ? sessionCopy.statusEnRouteSeeking
        : sessionCopy.statusEnRouteListing;
  } else if (record.meetAtIso) {
    meetAtLabelKo = formatMarketTradeMeetAtLabel(record.meetAtIso, now);
    countdownLabelKo = formatMarketTradeCountdownLabel(record.meetAtIso, now);
    if (activeStepId === "before_departure") {
      statusHeadlineKo = sessionCopy.statusBeforeDeparture;
      statusSublineKo = countdownLabelKo
        ? sessionCopy.statusConfirmedSeekingSub(`약속까지 ${countdownLabelKo}`)
        : null;
    } else if (activeStepId === "meeting") {
      statusHeadlineKo = sessionCopy.statusMeeting;
    } else if (record.viewerRole === "seeking") {
      statusHeadlineKo = sessionCopy.statusConfirmedSeeking;
      statusSublineKo = countdownLabelKo
        ? sessionCopy.statusConfirmedSeekingSub(`약속까지 ${countdownLabelKo}`)
        : null;
    } else {
      statusHeadlineKo = sessionCopy.statusConfirmedSeeking;
    }
  }

  const isEnRoute = record.tradeStatus === "en_route";
  const showNavigate =
    record.viewerRole === "seeking" &&
    Boolean(meetPlaceDisplay) &&
    (record.tradeStatus === "confirmed" || isEnRoute);
  const showDepart =
    record.viewerRole === "seeking" &&
    !isEnRoute &&
    record.tradeStatus === "confirmed" &&
    Boolean(record.meetAtIso);

  const showPickDay =
    record.viewerRole === "seeking" && record.tradeStatus === "scheduling";
  const showProposeSchedule =
    record.viewerRole === "listing" && record.tradeStatus === "buyer_picked_day";
  const showAcceptProposal =
    record.viewerRole === "seeking" && record.tradeStatus === "seller_proposed";

  const proposeTimeSlots =
    record.preferredMeetDateKey && showProposeSchedule
      ? generateMarketTradeTimeSlotsForDate(
          record.availabilityPreset,
          record.preferredMeetDateKey,
          now,
        )
      : [];

  const showHandshakeComplete = canShowHandshakeComplete(record);
  const viewerHandshakeConfirmed = readViewerHandshakeConfirmed(record);
  const otherHandshakeConfirmed = readOtherHandshakeConfirmed(record);
  const canConfirmHandshakeComplete =
    showHandshakeComplete && !viewerHandshakeConfirmed;
  const awaitingHandshakeOtherParty =
    showHandshakeComplete && viewerHandshakeConfirmed && !otherHandshakeConfirmed;
  const handshakeCompleteCtaKo =
    record.viewerRole === "seeking"
      ? sessionCopy.handshakeCompleteSeekingCta
      : sessionCopy.handshakeCompleteListingCta;

  let hostGuestEtaLabelKo: string | null = null;
  if (
    record.viewerRole === "listing" &&
    record.meetMode === "host" &&
    record.guestShareLocation
  ) {
    const eta = computeMarketTradeHostEta({
      guestLat: record.guestLat,
      guestLng: record.guestLng,
      guestLocationAtIso: record.guestLocationAtIso,
      anchorLat: record.meetLat,
      anchorLng: record.meetLng,
      now,
    });
    if (eta) {
      hostGuestEtaLabelKo = formatMarketTradeHostEtaLabel(eta, {
        arrived: sessionCopy.hostGuestEtaArrived,
        eta: sessionCopy.hostGuestEtaLine,
        stale: sessionCopy.hostGuestEtaStale,
      });
    }
  }

  return {
    ...record,
    roleBadgeKo,
    statusHeadlineKo,
    statusSublineKo,
    meetAtLabelKo,
    meetPlaceDisplay,
    proposalLineKo,
    progressSteps,
    activeStepId,
    countdownLabelKo,
    showNavigate,
    showDepart,
    isEnRoute,
    hostGuestEtaLabelKo,
    showProposePreferred: false,
    preferredMeetAtIso: record.preferredMeetAtIso,
    preferredMeetDateKey: record.preferredMeetDateKey,
    schedulingCountdownKo,
    showPickDay,
    showProposeSchedule,
    showAcceptProposal,
    proposeTimeSlots,
    canConfirmHandshakeComplete,
    awaitingHandshakeOtherParty,
    handshakeCompleteCtaKo,
  };
}
