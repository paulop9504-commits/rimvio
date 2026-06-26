import type { AppLocale } from "@/lib/i18n/types";

type LocaleWelcomeCopy = {
  title: string;
  body: string;
  languageLabel: string;
  regionLabel: string;
  continueCta: string;
  suggested: string;
};

const JA_WELCOME: LocaleWelcomeCopy = {
  title: "Rimvioへようこそ",
  body: "端末の言語に合わせました。必要なら変更できます。",
  languageLabel: "言語",
  regionLabel: "地域",
  continueCta: "続ける",
  suggested: "おすすめ",
};

/** Welcome sheet copy — ja is native; others use i18n bundles. */
export function resolveLocaleWelcomeCopy(
  locale: AppLocale,
  bundle: LocaleWelcomeCopy,
): LocaleWelcomeCopy {
  if (locale === "ja") {
    return JA_WELCOME;
  }
  return bundle;
}
