import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import type { MarketHandshakeRecord } from "@/lib/globe/market/market-handshake-types";
import {
  computeMarketTradeHostEta,
  formatMarketTradeHostEtaLabel,
} from "@/lib/globe/market/compute-market-trade-host-eta";
import type { MarketTradeSessionRecord, MarketTradeSessionView } from "@/lib/globe/market/market-trade-types";
import {
  buildMarketTradeProgressSteps,
  formatMarketTradeCountdownLabel,
  formatMarketTradeMeetAtLabel,
  formatMarketTradeProposalLine,
  resolveMarketTradeActiveStep,
} from "@/lib/globe/market/resolve-market-trade-progress";
import {
  formatMarketTradeSchedulingCountdown,
} from "@/lib/globe/market/resolve-market-trade-scheduling";

export type MarketTradeSessionCopy = {
  roleBadgeSeeking: string;
  roleBadgeListing: string;
  statusSchedulingListing: string;
  statusSchedulingListingSub: string;
  statusSchedulingSeeking: string;
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
  proposalPrefix: string;
  priceOpen: string;
  statusEnRouteSeeking: string;
  statusEnRouteListing: string;
  hostGuestEtaArrived: string;
  hostGuestEtaLine: (minutes: number, distanceKm: number) => string;
  hostGuestEtaStale: string;
  statusSchedulingSeekingSub: string;
  statusSchedulingListingPreferred: (label: string) => string;
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
    preferredMeetAtIso: handshake.preferredMeetAtIso,
    schedulingExpiresAtIso: handshake.schedulingExpiresAtIso,
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
  copy: MarketTradeSessionCopy,
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
      confirmed: copy.stepConfirmed,
      beforeDeparture: copy.stepBeforeDeparture,
      meeting: copy.stepMeeting,
      done: copy.stepDone,
    },
  });

  const roleBadgeKo =
    record.viewerRole === "seeking" ? copy.roleBadgeSeeking : copy.roleBadgeListing;

  let statusHeadlineKo = copy.statusSchedulingSeeking;
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
      statusHeadlineKo = copy.statusSchedulingListing;
      statusSublineKo = copy.statusSchedulingListingSub;
      if (record.preferredMeetAtIso) {
        const preferredLabel = formatMarketTradeMeetAtLabel(
          record.preferredMeetAtIso,
          now,
        );
        if (preferredLabel) {
          statusSublineKo = copy.statusSchedulingListingPreferred(preferredLabel);
        }
      }
      const firstCandidate = record.scheduleCandidates[0];
      if (firstCandidate) {
        proposalLineKo = formatMarketTradeProposalLine(
          firstCandidate,
          copy.proposalPrefix,
        );
      }
    } else {
      statusHeadlineKo = copy.statusSchedulingSeeking;
      statusSublineKo = copy.statusSchedulingSeekingSub;
      if (schedulingCountdownKo) {
        statusSublineKo = `${copy.statusSchedulingSeekingSub} · ${schedulingCountdownKo}`;
      }
    }
  } else if (record.tradeStatus === "expired") {
    statusHeadlineKo = copy.statusExpired;
  } else if (record.tradeStatus === "completed") {
    statusHeadlineKo = copy.statusCompleted;
  } else if (record.tradeStatus === "en_route") {
    statusHeadlineKo =
      record.viewerRole === "seeking"
        ? copy.statusEnRouteSeeking
        : copy.statusEnRouteListing;
  } else if (record.meetAtIso) {
    meetAtLabelKo = formatMarketTradeMeetAtLabel(record.meetAtIso, now);
    countdownLabelKo = formatMarketTradeCountdownLabel(record.meetAtIso, now);
    if (activeStepId === "before_departure") {
      statusHeadlineKo = copy.statusBeforeDeparture;
      statusSublineKo = countdownLabelKo
        ? copy.statusConfirmedSeekingSub(`약속까지 ${countdownLabelKo}`)
        : null;
    } else if (activeStepId === "meeting") {
      statusHeadlineKo = copy.statusMeeting;
    } else if (record.viewerRole === "seeking") {
      statusHeadlineKo = copy.statusConfirmedSeeking;
      statusSublineKo = countdownLabelKo
        ? copy.statusConfirmedSeekingSub(`약속까지 ${countdownLabelKo}`)
        : null;
    } else {
      statusHeadlineKo = copy.statusConfirmedSeeking;
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

  const showProposePreferred =
    record.viewerRole === "seeking" && record.tradeStatus === "scheduling";

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
        arrived: copy.hostGuestEtaArrived,
        eta: copy.hostGuestEtaLine,
        stale: copy.hostGuestEtaStale,
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
    showProposePreferred,
    preferredMeetAtIso: record.preferredMeetAtIso,
    schedulingCountdownKo,
  };
}
