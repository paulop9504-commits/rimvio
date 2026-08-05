/**
 * T7 — Scout partial-fail retry.
 * Same Job · same Anchor · same constraints · never Namba/Osaka trip fallback.
 */

export const MAX_SCOUT_ATTEMPTS = 2;

export type ScoutRetryLock = {
  readonly jobId: string | null;
  readonly anchorId: string;
  readonly anchorLat: number;
  readonly anchorLng: number;
  readonly nearLabelKo: string;
  readonly scoutUtterance: string;
  /** Freeze before loop — must stay Anchor label, never trip summary. */
  readonly areaHint: string;
};

/** Trip-level labels that must not replace a resolved near Anchor on retry. */
const FALLBACK_AREA_RE =
  /^(?:난바|나가호리|osaka|오사카|도톤보리|namba)(?:\s|$)/iu;

export type ScoutRetryProposal = {
  readonly jobId: string | null;
  readonly anchorId: string;
  readonly scoutUtterance: string;
  readonly areaHint: string | null;
  readonly lat: number | null | undefined;
  readonly lng: number | null | undefined;
};

export type ScoutRetryAssertOk = {
  readonly ok: true;
};

export type ScoutRetryAssertFail = {
  readonly ok: false;
  readonly code: "SCOUT_LOCK_DRIFT" | "SCOUT_FALLBACK_REJECTED";
  readonly statusKo: string;
};

export function createScoutRetryLock(input: {
  readonly jobId: string | null;
  readonly anchorId: string;
  readonly anchorLat: number;
  readonly anchorLng: number;
  readonly nearLabelKo: string;
  readonly scoutUtterance: string;
  readonly areaHint: string;
}): ScoutRetryLock {
  return {
    jobId: input.jobId,
    anchorId: input.anchorId,
    anchorLat: input.anchorLat,
    anchorLng: input.anchorLng,
    nearLabelKo: input.nearLabelKo,
    scoutUtterance: input.scoutUtterance.trim(),
    areaHint: input.areaHint.trim(),
  };
}

/**
 * Every retry invoke must match the first-attempt lock.
 * Rejects trip-summary / Namba fallback when Anchor is already fixed.
 */
export function assertScoutRetryProposal(input: {
  readonly lock: ScoutRetryLock;
  readonly proposed: ScoutRetryProposal;
}): ScoutRetryAssertOk | ScoutRetryAssertFail {
  const { lock, proposed } = input;
  if (proposed.jobId !== lock.jobId) {
    return {
      ok: false,
      code: "SCOUT_LOCK_DRIFT",
      statusKo: "검색 재시도는 같은 Job에서만 해요",
    };
  }
  if (proposed.anchorId !== lock.anchorId) {
    return {
      ok: false,
      code: "SCOUT_LOCK_DRIFT",
      statusKo: "검색 재시도는 같은 기준점을 유지해요",
    };
  }
  if (proposed.scoutUtterance.trim() !== lock.scoutUtterance) {
    return {
      ok: false,
      code: "SCOUT_LOCK_DRIFT",
      statusKo: "검색 재시도는 같은 조건을 유지해요",
    };
  }
  const hint = (proposed.areaHint ?? "").trim();
  if (hint !== lock.areaHint) {
    return {
      ok: false,
      code: "SCOUT_FALLBACK_REJECTED",
      statusKo: "다른 동네로 바꿔 찾지 않아요 · 같은 기준으로 다시 볼게요",
    };
  }
  // Extra belt: never allow classic Osaka seed labels as retry area when lock is elsewhere.
  if (
    FALLBACK_AREA_RE.test(hint) &&
    !FALLBACK_AREA_RE.test(lock.nearLabelKo) &&
    hint !== lock.nearLabelKo
  ) {
    return {
      ok: false,
      code: "SCOUT_FALLBACK_REJECTED",
      statusKo: "검색 실패 후 다른 역으로 넘어가지 않아요",
    };
  }
  if (
    typeof proposed.lat === "number" &&
    typeof proposed.lng === "number" &&
    (Math.abs(proposed.lat - lock.anchorLat) > 1e-5 ||
      Math.abs(proposed.lng - lock.anchorLng) > 1e-5)
  ) {
    return {
      ok: false,
      code: "SCOUT_LOCK_DRIFT",
      statusKo: "검색 재시도는 같은 좌표를 유지해요",
    };
  }
  return { ok: true };
}

export type AfterScoutEmpty =
  | { readonly retry: true; readonly nextAttempt: number }
  | {
      readonly retry: false;
      readonly code: "SCOUT_FAILED";
      readonly statusKo: string;
    };

/**
 * After an empty/Distance-gated zero result: retry once, then SCOUT_FAILED.
 * attempt = just-finished 1-based attempt index.
 */
export function resolveAfterScoutEmpty(input: {
  readonly attempt: number;
  readonly maxAttempts?: number;
  readonly nearLabelKo?: string | null;
}): AfterScoutEmpty {
  const max = input.maxAttempts ?? MAX_SCOUT_ATTEMPTS;
  if (input.attempt < max) {
    return { retry: true, nextAttempt: input.attempt + 1 };
  }
  const where = input.nearLabelKo?.trim() || "그곳";
  return {
    retry: false,
    code: "SCOUT_FAILED",
    statusKo: `${where} 근처 검색이 실패했어요 · 조건을 바꿔 말해 주세요`,
  };
}
