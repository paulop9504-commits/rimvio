import { formatRegionalMarketPriceLine } from "@/lib/format/format-regional-money";
import { copy } from "@/lib/copy/human-ko";
import {
  resolveRegionalProfile,
  type RegionalProfile,
} from "@/lib/preferences/regional-profile";

export function formatMarketPriceLine(
  priceMinKrw: number | null,
  priceMaxKrw: number | null,
  profile: RegionalProfile = resolveRegionalProfile("KR"),
  openLabel: string = copy.globe.marketIntentPriceOpen,
): string {
  return formatRegionalMarketPriceLine(priceMinKrw, priceMaxKrw, profile, openLabel);
}
