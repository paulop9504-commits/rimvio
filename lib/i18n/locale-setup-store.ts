export const LOCALE_SETUP_STORAGE_KEY = "rimvio.locale-setup.v1";
export const LOCALE_SETUP_UPDATED = "rimvio-locale-setup-updated";

function hasLegacyLocalePreferences(): boolean {
  try {
    return (
      localStorage.getItem("rimvio.locale.v1") != null ||
      localStorage.getItem("rimvio.home-country.v1") != null
    );
  } catch {
    return false;
  }
}

export function hasCompletedLocaleSetup(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    if (localStorage.getItem(LOCALE_SETUP_STORAGE_KEY) === "done") {
      return true;
    }
    return hasLegacyLocalePreferences();
  } catch {
    return true;
  }
}

export function markLocaleSetupComplete(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(LOCALE_SETUP_STORAGE_KEY, "done");
    window.dispatchEvent(new CustomEvent(LOCALE_SETUP_UPDATED));
  } catch {
    // ignore quota / private mode
  }
}
