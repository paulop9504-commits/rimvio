import type { AppLocale } from "@/lib/i18n/types";

/** BCP 47 tag for Web Speech API (STT + TTS). */
export function speechLangForLocale(locale: AppLocale = "ko"): string {
  switch (locale) {
    case "ko":
      return "ko-KR";
    case "ja":
      return "ja-JP";
    case "zh":
      return "zh-CN";
    case "en":
      return "en-US";
    default:
      return "ko-KR";
  }
}
