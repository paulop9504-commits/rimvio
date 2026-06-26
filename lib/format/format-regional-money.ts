import type { RegionalProfile } from "@/lib/preferences/regional-profile";

function formatKrwManwon(amountKrw: number): string {
  return `${Math.round(amountKrw / 10_000)}만원`;
}

function formatKrwIntl(amountKrw: number, profile: RegionalProfile): string {
  return new Intl.NumberFormat(profile.numberLocale, {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amountKrw);
}

function formatSinglePrice(amountKrw: number, profile: RegionalProfile): string {
  if (profile.priceStyle === "krw_manwon") {
    return formatKrwManwon(amountKrw);
  }
  return formatKrwIntl(amountKrw, profile);
}

/** Market intents store KRW — display adapts to viewer region. */
export function formatRegionalMarketPriceLine(
  priceMinKrw: number | null,
  priceMaxKrw: number | null,
  profile: RegionalProfile,
  openLabel: string,
): string {
  if (priceMinKrw === null && priceMaxKrw === null) {
    return openLabel;
  }

  if (priceMinKrw !== null && priceMaxKrw !== null) {
    if (priceMinKrw === priceMaxKrw) {
      return formatSinglePrice(priceMinKrw, profile);
    }
    if (profile.priceStyle === "krw_manwon") {
      return `${formatKrwManwon(priceMinKrw)}~${formatKrwManwon(priceMaxKrw)}`;
    }
    return `${formatKrwIntl(priceMinKrw, profile)} – ${formatKrwIntl(priceMaxKrw, profile)}`;
  }

  const value = priceMinKrw ?? priceMaxKrw ?? 0;
  if (profile.priceStyle === "krw_manwon") {
    if (priceMaxKrw !== null) {
      return `${formatKrwManwon(value)} 이하`;
    }
    if (priceMinKrw !== null) {
      return `${formatKrwManwon(value)} 이상`;
    }
  }
  if (priceMaxKrw !== null) {
    return `${formatKrwIntl(value, profile)} max`;
  }
  return `${formatKrwIntl(value, profile)}+`;
}

export function formatRegionalMarketPriceRangeLine(
  priceMinKrw: number | null,
  priceMaxKrw: number | null,
  profile: RegionalProfile,
  openLabel: string,
  labels?: { maxOnly?: string; minOnly?: string },
): string {
  if (priceMinKrw === null && priceMaxKrw === null) {
    return openLabel;
  }
  if (priceMinKrw !== null && priceMaxKrw !== null && priceMinKrw === priceMaxKrw) {
    return formatSinglePrice(priceMinKrw, profile);
  }
  if (priceMaxKrw !== null && priceMinKrw === null) {
    const base = formatSinglePrice(priceMaxKrw, profile);
    return labels?.maxOnly ?? `${base} 이하`;
  }
  if (priceMinKrw !== null && priceMaxKrw === null) {
    const base = formatSinglePrice(priceMinKrw, profile);
    return labels?.minOnly ?? `${base} 이상`;
  }
  if (priceMinKrw !== null && priceMaxKrw !== null) {
    return `${formatSinglePrice(priceMinKrw, profile)}~${formatSinglePrice(priceMaxKrw, profile)}`;
  }
  return openLabel;
}
