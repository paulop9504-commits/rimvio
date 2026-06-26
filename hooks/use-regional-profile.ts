"use client";

import { useCallback, useEffect, useState } from "react";
import type { CountryCode } from "@/lib/links/spark-locale";
import {
  getHomeCountry,
  HOME_COUNTRY_UPDATED,
  setHomeCountry as persistHomeCountry,
} from "@/lib/preferences/home-country";
import {
  resolveRegionalProfile,
  type RegionalProfile,
} from "@/lib/preferences/regional-profile";

export function useRegionalProfile(): {
  profile: RegionalProfile;
  countryCode: CountryCode;
  ready: boolean;
  setCountryCode: (code: CountryCode) => void;
} {
  const [countryCode, setCountryCodeState] = useState<CountryCode>("KR");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      setCountryCodeState(getHomeCountry() ?? "KR");
      setReady(true);
    };
    sync();
    window.addEventListener(HOME_COUNTRY_UPDATED, sync);
    return () => window.removeEventListener(HOME_COUNTRY_UPDATED, sync);
  }, []);

  const setCountryCode = useCallback((code: CountryCode) => {
    persistHomeCountry(code);
    setCountryCodeState(code);
  }, []);

  return {
    profile: resolveRegionalProfile(countryCode),
    countryCode,
    ready,
    setCountryCode,
  };
}
