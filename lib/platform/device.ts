export function isIOS() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function isAndroid() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /Android/i.test(navigator.userAgent);
}

export function isMobileDevice(): boolean {
  return isIOS() || isAndroid();
}

/** Low-RAM phones / tablets — throttle decode, previews, LLM. */
export function isConstrainedMobileDevice(): boolean {
  if (!isMobileDevice()) {
    return false;
  }
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof memory === "number" && memory > 0) {
    return memory <= 4;
  }
  return true;
}

export function isSlowNetwork(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  const conn = (
    navigator as Navigator & {
      connection?: { effectiveType?: string; saveData?: boolean };
    }
  ).connection;
  if (!conn) {
    return isMobileDevice();
  }
  if (conn.saveData) {
    return true;
  }
  const type = conn.effectiveType?.trim() ?? "";
  return type === "slow-2g" || type === "2g" || type === "3g";
}

export function shouldSkipHeavyPhotoEnrichment(): boolean {
  return isConstrainedMobileDevice() || isSlowNetwork();
}

export function isStandalonePwa() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari standalone
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function supportsShareTarget() {
  return isAndroid() && !isIOS();
}

export function supportsNativeShare() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return typeof navigator.share === "function";
}
