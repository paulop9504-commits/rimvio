import type { CountryCode } from "@/lib/links/spark-locale";

export type DistanceUnit = "km" | "mi";

export type RegionalPriceStyle = "krw_manwon" | "krw_intl";

export type RegionalProfile = {
  countryCode: CountryCode;
  distanceUnit: DistanceUnit;
  timeZone: string;
  /** BCP 47 — number, date, currency grouping */
  numberLocale: string;
  priceStyle: RegionalPriceStyle;
};

const IMPERIAL_COUNTRIES = new Set<CountryCode>(["US", "GB"]);

const REGIONAL_PROFILES: Record<CountryCode, RegionalProfile> = {
  KR: {
    countryCode: "KR",
    distanceUnit: "km",
    timeZone: "Asia/Seoul",
    numberLocale: "ko-KR",
    priceStyle: "krw_manwon",
  },
  US: {
    countryCode: "US",
    distanceUnit: "mi",
    timeZone: "America/New_York",
    numberLocale: "en-US",
    priceStyle: "krw_intl",
  },
  JP: {
    countryCode: "JP",
    distanceUnit: "km",
    timeZone: "Asia/Tokyo",
    numberLocale: "ja-JP",
    priceStyle: "krw_intl",
  },
  PH: {
    countryCode: "PH",
    distanceUnit: "km",
    timeZone: "Asia/Manila",
    numberLocale: "en-PH",
    priceStyle: "krw_intl",
  },
  TH: {
    countryCode: "TH",
    distanceUnit: "km",
    timeZone: "Asia/Bangkok",
    numberLocale: "th-TH",
    priceStyle: "krw_intl",
  },
  VN: {
    countryCode: "VN",
    distanceUnit: "km",
    timeZone: "Asia/Ho_Chi_Minh",
    numberLocale: "vi-VN",
    priceStyle: "krw_intl",
  },
  TW: {
    countryCode: "TW",
    distanceUnit: "km",
    timeZone: "Asia/Taipei",
    numberLocale: "zh-TW",
    priceStyle: "krw_intl",
  },
  SG: {
    countryCode: "SG",
    distanceUnit: "km",
    timeZone: "Asia/Singapore",
    numberLocale: "en-SG",
    priceStyle: "krw_intl",
  },
  ID: {
    countryCode: "ID",
    distanceUnit: "km",
    timeZone: "Asia/Jakarta",
    numberLocale: "id-ID",
    priceStyle: "krw_intl",
  },
  AU: {
    countryCode: "AU",
    distanceUnit: "km",
    timeZone: "Australia/Sydney",
    numberLocale: "en-AU",
    priceStyle: "krw_intl",
  },
  GB: {
    countryCode: "GB",
    distanceUnit: "mi",
    timeZone: "Europe/London",
    numberLocale: "en-GB",
    priceStyle: "krw_intl",
  },
  FR: {
    countryCode: "FR",
    distanceUnit: "km",
    timeZone: "Europe/Paris",
    numberLocale: "fr-FR",
    priceStyle: "krw_intl",
  },
  IT: {
    countryCode: "IT",
    distanceUnit: "km",
    timeZone: "Europe/Rome",
    numberLocale: "it-IT",
    priceStyle: "krw_intl",
  },
  ES: {
    countryCode: "ES",
    distanceUnit: "km",
    timeZone: "Europe/Madrid",
    numberLocale: "es-ES",
    priceStyle: "krw_intl",
  },
  DE: {
    countryCode: "DE",
    distanceUnit: "km",
    timeZone: "Europe/Berlin",
    numberLocale: "de-DE",
    priceStyle: "krw_intl",
  },
  CN: {
    countryCode: "CN",
    distanceUnit: "km",
    timeZone: "Asia/Shanghai",
    numberLocale: "zh-CN",
    priceStyle: "krw_intl",
  },
};

export function resolveRegionalProfile(
  countryCode: CountryCode | null | undefined,
): RegionalProfile {
  if (countryCode && REGIONAL_PROFILES[countryCode]) {
    return REGIONAL_PROFILES[countryCode];
  }
  return REGIONAL_PROFILES.KR;
}

export function usesImperialDistance(countryCode: CountryCode): boolean {
  return IMPERIAL_COUNTRIES.has(countryCode);
}

export function kmToDisplayDistance(km: number, profile: RegionalProfile): number {
  if (profile.distanceUnit === "mi") {
    return km * 0.621_371;
  }
  return km;
}
