export {
  resolveTripSituationRouter,
} from "@/lib/globe/trip-situation-router/resolve-trip-situation-router";
export {
  buildTripContextCreatedChatLine,
  buildTripFlowNextStepLine,
  buildTripIngressCreatedChatAssistantLine,
  composeTripFlowChatAssistantLine,
} from "@/lib/globe/trip-situation-router/build-trip-flow-chat-lines";
export {
  buildTripPrepareChips,
  buildTripPrepareOfferLine,
  offerTripPrepareChips,
  TRIP_PREPARE_SLOT_ID,
} from "@/lib/globe/trip-situation-router/build-trip-prepare-offer";
export {
  buildCountryCityPickChoices,
  buildCountryCityPickQuestion,
  offerCountryCityPickChips,
  shouldOfferCountryCityPick,
  COUNTRY_CITY_OTHER_ID,
  COUNTRY_CITY_SLOT_ID,
} from "@/lib/globe/trip-situation-router/build-country-city-pick-offer";
export type {
  TripSituationRouterAction,
  TripSituationRouterChip,
  TripSituationRouterStage,
  TripSituationRouterState,
} from "@/lib/globe/trip-situation-router/types";
