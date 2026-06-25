import { copy } from "@/lib/copy/human-ko";
import type { MarketTradeSessionCopy } from "@/lib/globe/market/build-market-trade-session-view";

export const marketTradeSessionCopy: MarketTradeSessionCopy = {
  roleBadgeSeeking: copy.globe.marketTradeRoleBadgeSeeking,
  roleBadgeListing: copy.globe.marketTradeRoleBadgeListing,
  statusSchedulingListing: copy.globe.marketTradeStatusSchedulingListing,
  statusSchedulingListingSub: copy.globe.marketTradeStatusSchedulingListingSub,
  statusSchedulingSeeking: copy.globe.marketTradeStatusSchedulingSeeking,
  statusConfirmedSeeking: copy.globe.marketTradeStatusConfirmedSeeking,
  statusConfirmedSeekingSub: copy.globe.marketTradeStatusConfirmedSeekingSub,
  statusBeforeDeparture: copy.globe.marketTradeStatusBeforeDeparture,
  statusMeeting: copy.globe.marketTradeStatusMeeting,
  statusCompleted: copy.globe.marketTradeStatusCompleted,
  stepConfirmed: copy.globe.marketTradeStepConfirmed,
  stepBeforeDeparture: copy.globe.marketTradeStepBeforeDeparture,
  stepMeeting: copy.globe.marketTradeStepMeeting,
  stepDone: copy.globe.marketTradeStepDone,
  proposalPrefix: copy.globe.marketTradeProposalPrefix,
  priceOpen: copy.globe.marketIntentPriceOpen,
  statusEnRouteSeeking: copy.globe.marketTradeStatusEnRouteSeeking,
  statusEnRouteListing: copy.globe.marketTradeStatusEnRouteListing,
  hostGuestEtaArrived: copy.globe.marketTradeHostGuestEtaArrived,
  hostGuestEtaLine: copy.globe.marketTradeHostGuestEtaLine,
  hostGuestEtaStale: copy.globe.marketTradeHostGuestEtaStale,
};
