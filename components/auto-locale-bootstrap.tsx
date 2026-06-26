"use client";

import { useEffect } from "react";
import { autoInitAppLocale } from "@/lib/i18n/locale-store";
import { hasCompletedLocaleSetup } from "@/lib/i18n/locale-setup-store";
import { autoInitHomeCountry } from "@/lib/preferences/home-country";

/** Returning users: persist browser defaults if missing. First run: welcome sheet handles it. */
export function AutoLocaleBootstrap() {
  useEffect(() => {
    if (!hasCompletedLocaleSetup()) {
      return;
    }
    autoInitAppLocale();
    autoInitHomeCountry();
  }, []);

  return null;
}
