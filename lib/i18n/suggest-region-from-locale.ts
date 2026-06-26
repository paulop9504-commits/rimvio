import type { AppLocale } from "@/lib/i18n/types";
import type { CountryCode } from "@/lib/links/spark-locale";

/** Map UI language → default region (user can override on welcome screen). */
export function suggestRegionFromAppLocale(locale: AppLocale): CountryCode {
  switch (locale) {
    case "ko":
      return "KR";
    case "ja":
      return "JP";
    case "zh":
      return "CN";
    case "th":
      return "TH";
    case "vi":
      return "VN";
    case "id":
      return "ID";
    case "fil":
      return "PH";
    case "fr":
      return "FR";
    case "de":
      return "DE";
    case "it":
      return "IT";
    case "es":
      return "ES";
    case "hi":
      return "US";
    case "en":
    default:
      return "US";
  }
}
