/**
 * Lodging display prices — Unit Canon (ADR-047).
 * Re-export SSOT from lib/unit-canon (display = nightly, commit = total).
 */

export {
  resolveStayNights,
  resolveLodgingNightlyKrw,
  formatLodgingNightlyPriceLabelKo,
  stripLodgingPerNightSuffix,
  formatHotelPriceDisplayKo,
} from "@/lib/unit-canon/lodging-money";
