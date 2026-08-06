/**
 * Unit Canon SSOT — docs/RIMVIO_UNIT_CANON.md · ADR-047
 */

export {
  UNIT_CANON_VERSION,
  UNIT_SURFACES,
  MONEY_BASES,
  DEFAULT_CURRENCY,
  LODGING_DISPLAY_MONEY_BASIS,
  LODGING_COMMIT_MONEY_BASIS,
  WALK_METERS_PER_MINUTE,
  RATING_SCALE_MAX,
  MATCH_SCORE_MAX,
  walkMinutesFromMeters,
  assertDecisionWeightsSumToOne,
  type UnitSurface,
  type MoneyBasis,
  type MeasuredMoney,
  type MeasuredDistance,
} from "@/lib/unit-canon/constants";

export {
  resolveStayNights,
  resolveLodgingNightlyKrw,
  formatLodgingNightlyPriceLabelKo,
  stripLodgingPerNightSuffix,
  formatHotelPriceDisplayKo,
  measuredLodgingDisplayMoney,
  measuredLodgingCommitMoney,
} from "@/lib/unit-canon/lodging-money";
