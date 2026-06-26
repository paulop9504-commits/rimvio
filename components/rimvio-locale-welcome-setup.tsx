"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { RimvioLogo } from "@/components/rimvio-logo";
import { detectAppLocaleFromBrowser } from "@/lib/i18n/detect-locale";
import { getCopy } from "@/lib/i18n/get-copy";
import {
  appLocaleLabel,
  countryFlagEmoji,
  countryLabelForUi,
  WELCOME_APP_LOCALES,
} from "@/lib/i18n/locale-labels";
import {
  hasCompletedLocaleSetup,
  markLocaleSetupComplete,
  LOCALE_SETUP_UPDATED,
} from "@/lib/i18n/locale-setup-store";
import { resolveLocaleWelcomeCopy } from "@/lib/i18n/locale-welcome-copy";
import { useLocale } from "@/lib/i18n/locale-context";
import { writeStoredLocale } from "@/lib/i18n/locale-store";
import { suggestRegionFromAppLocale } from "@/lib/i18n/suggest-region-from-locale";
import type { AppLocale } from "@/lib/i18n/types";
import {
  listHomeCountryOptions,
  type CountryCode,
} from "@/lib/links/spark-locale";
import { setHomeCountry, suggestHomeCountryFromBrowser } from "@/lib/preferences/home-country";
import { IOS } from "@/lib/ui/ios-surface";
import { cn } from "@/lib/utils";

/**
 * First launch — auto-detect language + region, one-tap continue.
 * Not a blocking "pick language" gate; defaults are pre-filled.
 */
export function RimvioLocaleWelcomeSetup() {
  const { setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<AppLocale>("ko");
  const [region, setRegion] = useState<CountryCode>("KR");
  const [suggestedLanguage, setSuggestedLanguage] = useState<AppLocale>("ko");
  const [suggestedRegion, setSuggestedRegion] = useState<CountryCode>("KR");

  useEffect(() => {
    const syncOpen = () => {
      setOpen(!hasCompletedLocaleSetup());
    };
    syncOpen();
    window.addEventListener(LOCALE_SETUP_UPDATED, syncOpen);
    return () => window.removeEventListener(LOCALE_SETUP_UPDATED, syncOpen);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const detectedLang = detectAppLocaleFromBrowser();
    const welcomeLang = WELCOME_APP_LOCALES.includes(detectedLang) ? detectedLang : "en";
    const detectedRegion = suggestHomeCountryFromBrowser();
    const regionFromLang = suggestRegionFromAppLocale(welcomeLang);

    setSuggestedLanguage(welcomeLang);
    setSuggestedRegion(detectedRegion);
    setLanguage(welcomeLang);
    setRegion(detectedRegion || regionFromLang);
    setLocale(welcomeLang);
  }, [open, setLocale]);

  const welcomeCopy = useMemo(() => {
    const bundle = getCopy(language === "ko" ? "ko" : "en").localeWelcome;
    return resolveLocaleWelcomeCopy(language, bundle);
  }, [language]);

  const regionOptions = listHomeCountryOptions();

  const confirm = () => {
    writeStoredLocale(language);
    setLocale(language);
    setHomeCountry(region);
    markLocaleSetupComplete();
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="rimvio-locale-welcome"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center"
          role="dialog"
          aria-modal
          aria-labelledby="rimvio-locale-welcome-title"
        >
          <motion.div
            initial={{ y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className={cn("w-full max-w-md p-6", IOS.card)}
          >
            <div className="mb-5 flex items-center gap-3">
              <RimvioLogo size="sm" appearance="white" />
              <div className="min-w-0">
                <h2
                  id="rimvio-locale-welcome-title"
                  className="text-[20px] font-semibold tracking-tight text-foreground"
                >
                  {welcomeCopy.title}
                </h2>
                <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">
                  {welcomeCopy.body}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="text-[13px] font-semibold text-foreground">
                  {welcomeCopy.languageLabel}
                </span>
                <div className="relative mt-2">
                  <select
                    value={language}
                    onChange={(event) => {
                      const next = event.target.value as AppLocale;
                      setLanguage(next);
                      setLocale(next);
                      if (!regionOptions.some((row) => row.code === region)) {
                        setRegion(suggestRegionFromAppLocale(next));
                      }
                    }}
                    className="w-full appearance-none rounded-2xl border border-black/[0.08] bg-white px-4 py-3.5 pr-10 text-[16px] font-medium text-foreground shadow-sm outline-none focus:border-[#3182f6]/40"
                  >
                    {WELCOME_APP_LOCALES.map((locale) => (
                      <option key={locale} value={locale}>
                        {appLocaleLabel(locale)}
                        {locale === suggestedLanguage ? ` · ${welcomeCopy.suggested}` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-[13px] font-semibold text-foreground">
                  {welcomeCopy.regionLabel}
                </span>
                <div className="relative mt-2">
                  <select
                    value={region}
                    onChange={(event) => setRegion(event.target.value as CountryCode)}
                    className="w-full appearance-none rounded-2xl border border-black/[0.08] bg-white px-4 py-3.5 pr-10 text-[16px] font-medium text-foreground shadow-sm outline-none focus:border-[#3182f6]/40"
                  >
                    {regionOptions.map((option) => (
                      <option key={option.code} value={option.code}>
                        {`${countryFlagEmoji(option.code)} ${countryLabelForUi(option.code, language)}`}
                        {option.code === suggestedRegion ? ` · ${welcomeCopy.suggested}` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                </div>
              </label>
            </div>

            <button
              type="button"
              onClick={confirm}
              className={cn("mt-6 w-full", IOS.primaryBtn, "h-12 text-[16px] font-semibold")}
            >
              {welcomeCopy.continueCta}
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
