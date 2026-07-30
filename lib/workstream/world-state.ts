/**
 * World State — external Reality the Agent keeps observing (ADR-046).
 * Weather · FX · transit · events · booking availability.
 * Not Goal/Context/Execution — the world around the trip.
 */

export type WorldSignalKind =
  | "weather"
  | "fx"
  | "transit"
  | "event"
  | "booking_availability"
  | "price";

export type WorldSignalSeverity = "info" | "watch" | "alert";

export type WorldSignal = {
  readonly id: string;
  readonly kind: WorldSignalKind;
  readonly severity: WorldSignalSeverity;
  readonly labelKo: string;
  readonly detailKo: string;
  readonly observedAtIso: string;
  /** Optional structured hint for Opportunity Detector. */
  readonly hint?: string | null;
};

export type WorldState = {
  readonly contextEventId: string;
  readonly signals: readonly WorldSignal[];
  readonly updatedAtIso: string;
};

const STORAGE_KEY = "rimvio.world-state.v1";
let memoryStore: Record<string, WorldState> = {};

function readStore(): Record<string, WorldState> {
  if (typeof window === "undefined") return memoryStore;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, WorldState>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, WorldState>): void {
  memoryStore = store;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* quota */
  }
}

export function readWorldState(contextEventId: string): WorldState | null {
  const id = contextEventId.trim();
  if (!id) return null;
  return readStore()[id] ?? null;
}

export function writeWorldState(state: WorldState): WorldState {
  const store = readStore();
  store[state.contextEventId] = state;
  writeStore(store);
  return state;
}

export function upsertWorldSignal(input: {
  readonly contextEventId: string;
  readonly signal: Omit<WorldSignal, "observedAtIso"> & {
    readonly observedAtIso?: string;
  };
}): WorldState {
  const contextEventId = input.contextEventId.trim();
  const prev = readWorldState(contextEventId);
  const now = new Date().toISOString();
  const nextSignal: WorldSignal = {
    ...input.signal,
    observedAtIso: input.signal.observedAtIso ?? now,
  };
  const without = (prev?.signals ?? []).filter((s) => s.id !== nextSignal.id);
  return writeWorldState({
    contextEventId,
    signals: [...without, nextSignal],
    updatedAtIso: now,
  });
}

/**
 * Seed / refresh observational World State from destination cues.
 * Deterministic stubs — live APIs plug in later as Capabilities.
 */
export function observeWorldState(input: {
  readonly contextEventId: string;
  readonly destinationHint?: string | null;
  readonly utterance?: string | null;
}): WorldState {
  const contextEventId = input.contextEventId.trim();
  const dest =
    input.destinationHint?.trim() ||
    (/오사카|osaka/i.test(input.utterance ?? "")
      ? "오사카"
      : /제주|jeju/i.test(input.utterance ?? "")
        ? "제주"
        : "여행지");
  const now = new Date().toISOString();
  const base: WorldSignal[] = [
    {
      id: "weather:default",
      kind: "weather",
      severity: "info",
      labelKo: `${dest} 날씨`,
      detailKo: `${dest} 맑음·구름 — 야외 일정 가능`,
      observedAtIso: now,
      hint: null,
    },
    {
      id: "fx:krwjpy",
      kind: "fx",
      severity: "info",
      labelKo: "환율",
      detailKo: "KRW/JPY 관찰 중",
      observedAtIso: now,
      hint: null,
    },
    {
      id: "transit:default",
      kind: "transit",
      severity: "info",
      labelKo: "교통",
      detailKo: `${dest} 시내 이동 정상`,
      observedAtIso: now,
      hint: null,
    },
    {
      id: "booking:default",
      kind: "booking_availability",
      severity: "info",
      labelKo: "예약 가능",
      detailKo: "주요 숙소·티켓 예약 가능",
      observedAtIso: now,
      hint: null,
    },
  ];

  // Opportunity-shaped world cues (user didn't ask — Agent may surface).
  if (/오사카|osaka|usj/i.test(`${dest} ${input.utterance ?? ""}`)) {
    base.push({
      id: "event:usj-promo",
      kind: "event",
      severity: "watch",
      labelKo: "USJ 할인 이벤트",
      detailKo: "유니버설 스튜디오 재팬 기간 한정 할인 감지",
      observedAtIso: now,
      hint: "usj_discount",
    });
  }
  if (/항공|비행|flight|티켓/i.test(input.utterance ?? "")) {
    base.push({
      id: "price:flight-drop",
      kind: "price",
      severity: "watch",
      labelKo: "항공권 가격 급락",
      detailKo: "관측 구간 대비 항공권 가격 하락",
      observedAtIso: now,
      hint: "flight_price_drop",
    });
  }
  if (/태풍|typhoon|폭우|취소/i.test(input.utterance ?? "")) {
    base.push({
      id: "weather:typhoon",
      kind: "weather",
      severity: "alert",
      labelKo: "태풍·기상 경보",
      detailKo: "야외·이동 일정 재배치 권고",
      observedAtIso: now,
      hint: "typhoon_reschedule",
    });
  }

  const prev = readWorldState(contextEventId);
  const byId = new Map((prev?.signals ?? []).map((s) => [s.id, s]));
  for (const s of base) byId.set(s.id, s);
  return writeWorldState({
    contextEventId,
    signals: [...byId.values()],
    updatedAtIso: now,
  });
}

export function formatWorldStateBrief(state: WorldState | null): string {
  if (!state || state.signals.length === 0) return "World State: (empty)";
  return [
    "World State:",
    ...state.signals.map(
      (s) => `  · [${s.severity}] ${s.labelKo} — ${s.detailKo}`,
    ),
  ].join("\n");
}

export function clearWorldStateForTests(contextEventId?: string): void {
  if (!contextEventId) {
    memoryStore = {};
    return;
  }
  const store = readStore();
  delete store[contextEventId.trim()];
  writeStore(store);
}
