import type { AppLocale } from "@/lib/i18n/types";
import type { CountryCode } from "@/lib/links/spark-locale";
import { getCountryLabelKo } from "@/lib/links/spark-locale";

const APP_LOCALE_LABELS: Record<AppLocale, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
  zh: "中文",
  th: "ไทย",
  vi: "Tiếng Việt",
  id: "Bahasa Indonesia",
  hi: "हिन्दी",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  pt: "Português",
  fil: "Filipino",
};

/** First-run quick picks — full list lives in Settings. */
export const WELCOME_APP_LOCALES: AppLocale[] = ["ko", "en", "ja"];

const COUNTRY_LABEL_EN: Record<CountryCode, string> = {
  KR: "Korea",
  US: "United States",
  JP: "Japan",
  PH: "Philippines",
  TH: "Thailand",
  VN: "Vietnam",
  TW: "Taiwan",
  SG: "Singapore",
  ID: "Indonesia",
  AU: "Australia",
  GB: "United Kingdom",
  FR: "France",
  IT: "Italy",
  ES: "Spain",
  DE: "Germany",
  CN: "China",
};

const COUNTRY_LABEL_JA: Partial<Record<CountryCode, string>> = {
  KR: "韓国",
  US: "アメリカ",
  JP: "日本",
};

export function appLocaleLabel(locale: AppLocale): string {
  return APP_LOCALE_LABELS[locale] ?? locale;
}

export function countryLabelForUi(
  code: CountryCode,
  uiLocale: AppLocale,
): string {
  if (uiLocale === "ko") {
    return getCountryLabelKo(code);
  }
  if (uiLocale === "ja") {
    return COUNTRY_LABEL_JA[code] ?? COUNTRY_LABEL_EN[code];
  }
  return COUNTRY_LABEL_EN[code];
}

export function countryFlagEmoji(code: CountryCode): string {
  switch (code) {
    case "KR":
      return "🇰🇷";
    case "US":
      return "🇺🇸";
    case "JP":
      return "🇯🇵";
    case "PH":
      return "🇵🇭";
    case "TH":
      return "🇹🇭";
    case "VN":
      return "🇻🇳";
    case "TW":
      return "🇹🇼";
    case "SG":
      return "🇸🇬";
    case "ID":
      return "🇮🇩";
    case "AU":
      return "🇦🇺";
    case "GB":
      return "🇬🇧";
    case "FR":
      return "🇫🇷";
    case "IT":
      return "🇮🇹";
    case "ES":
      return "🇪🇸";
    case "DE":
      return "🇩🇪";
    case "CN":
      return "🇨🇳";
    default:
      return "🌐";
  }
}
