/**
 * Travel onboarding parallel exception — single-fire overlay on Blueprint.
 * Blueprint remains readOnly; bootstrap flag lives in session overlay.
 */

const STORAGE_PREFIX = "rimvio.travel-onboarding-bootstrap.";

export type TravelOnboardingBootstrapOverlay = {
  readonly contextId: string;
  /** Once true, onboarding_parallel_exception must never reopen. */
  readonly onboardingBootstrapUsed: boolean;
  readonly usedAtIso: string | null;
};

function storageKey(contextId: string): string {
  return `${STORAGE_PREFIX}${contextId.trim()}`;
}

export function readTravelOnboardingBootstrap(
  contextId: string,
): TravelOnboardingBootstrapOverlay {
  const id = contextId.trim();
  const empty: TravelOnboardingBootstrapOverlay = {
    contextId: id,
    onboardingBootstrapUsed: false,
    usedAtIso: null,
  };
  if (!id || typeof window === "undefined") {
    return empty;
  }
  try {
    const raw = sessionStorage.getItem(storageKey(id));
    if (!raw) {
      return empty;
    }
    const parsed = JSON.parse(raw) as Partial<TravelOnboardingBootstrapOverlay>;
    return {
      contextId: id,
      onboardingBootstrapUsed: Boolean(parsed.onboardingBootstrapUsed),
      usedAtIso: parsed.usedAtIso?.trim() || null,
    };
  } catch {
    return empty;
  }
}

export function markTravelOnboardingBootstrapUsed(contextId: string): TravelOnboardingBootstrapOverlay {
  const id = contextId.trim();
  const next: TravelOnboardingBootstrapOverlay = {
    contextId: id,
    onboardingBootstrapUsed: true,
    usedAtIso: new Date().toISOString(),
  };
  if (!id || typeof window === "undefined") {
    return next;
  }
  try {
    sessionStorage.setItem(storageKey(id), JSON.stringify(next));
  } catch {
    // ignore quota
  }
  return next;
}

/** Test / reset helper — not for product UI. */
export function clearTravelOnboardingBootstrap(contextId: string): void {
  const id = contextId.trim();
  if (!id || typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.removeItem(storageKey(id));
  } catch {
    // ignore
  }
}
