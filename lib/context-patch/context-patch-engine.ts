/**
 * Context Patch Engine
 *
 * Instead of re-interpreting the whole context, extract ONLY the slots
 * that changed and produce a typed diff.
 *
 * "제주도로 이동" → { location: "제주도" }
 * "4박5일"       → { duration: 5 }
 * "숙소 두 개"    → { hotelCount: 2 }
 * "100만원"      → { budget: 1000000 }
 * "렌터카"       → { transport: "렌터카" }
 */

import { extractTravelDestination } from "@/lib/experience-run/extract-travel-destination";

export type SlotKey =
  | "location"
  | "duration"
  | "hotelCount"
  | "budget"
  | "transport"
  | "companions"
  | "purpose"
  | "startDate"
  | "endDate"
  | "accommodation"
  | "mealPref"
  | "activity";

export type SlotPatch = {
  readonly key: SlotKey;
  readonly previousValue: unknown;
  readonly newValue: unknown;
  readonly source: string;
};

export type PatchResult = {
  readonly patches: readonly SlotPatch[];
  readonly newSlots: Readonly<Record<string, unknown>>;
  readonly summary: string;
};

type SlotExtractor = {
  readonly key: SlotKey;
  readonly extract: (text: string) => unknown | null;
};

const EXTRACTORS: readonly SlotExtractor[] = [
  {
    key: "location",
    extract: (t) => {
      const fromShared = extractTravelDestination(t);
      if (fromShared) return fromShared;

      const m = t.match(/(.+?)(으로|로)\s*(이동|변경|바꿔|가자|갈래|출발)/);
      if (m) return m[1]!.trim();
      return null;
    },
  },
  {
    key: "duration",
    extract: (t) => {
      const m = t.match(/(\d+)\s*박\s*(\d+)?\s*일/);
      if (m) return Number(m[1]) + 1;
      const m2 = t.match(/(\d+)\s*일/);
      if (m2) return Number(m2[1]);
      const m3 = t.match(/(\d+)\s*nights?/i);
      if (m3) return Number(m3[1]) + 1;
      return null;
    },
  },
  {
    key: "budget",
    extract: (t) => {
      const m = t.match(/(\d+)\s*만\s*원/);
      if (m) return Number(m[1]) * 10000;
      const m2 = t.match(/(\d[\d,]*)\s*원/);
      if (m2) return Number(m2[1]!.replace(/,/g, ""));
      return null;
    },
  },
  {
    key: "hotelCount",
    extract: (t) => {
      const m = t.match(/숙소\s*(\d+)\s*(개|곳|군데)/);
      if (m) return Number(m[1]);
      const m2 = t.match(/(\d+)\s*(개|곳)\s*숙소/);
      if (m2) return Number(m2[1]);
      return null;
    },
  },
  {
    key: "transport",
    extract: (t) => {
      const m = t.match(/(렌터카|렌트카|택시|버스|지하철|전철|기차|KTX|비행기|자차|대중교통)/);
      if (m) return m[1];
      return null;
    },
  },
  {
    key: "companions",
    extract: (t) => {
      const m = t.match(/(\d+)\s*명/);
      if (m) return Number(m[1]);
      if (/혼자|나만|1인/.test(t)) return 1;
      if (/커플|둘이/.test(t)) return 2;
      if (/가족/.test(t)) return 4;
      return null;
    },
  },
  {
    key: "accommodation",
    extract: (t) => {
      const m = t.match(/(호텔|에어비앤비|민박|게스트하우스|캡슐|리조트|풀빌라|펜션|모텔)/);
      if (m) return m[1];
      return null;
    },
  },
  {
    key: "activity",
    extract: (t) => {
      const m = t.match(/(맛집|관광|쇼핑|온천|스노클링|다이빙|트레킹|골프|스키|서핑|카페)/);
      if (m) return m[1];
      return null;
    },
  },
];

export function extractPatches(
  utterance: string,
  currentSlots: Readonly<Record<string, unknown>>,
): PatchResult {
  const patches: SlotPatch[] = [];
  const newSlots = { ...currentSlots };

  for (const ext of EXTRACTORS) {
    const value = ext.extract(utterance);
    if (value !== null && value !== currentSlots[ext.key]) {
      patches.push({
        key: ext.key,
        previousValue: currentSlots[ext.key] ?? null,
        newValue: value,
        source: utterance,
      });
      newSlots[ext.key] = value;
    }
  }

  const summary = patches.length === 0
    ? "변경 없음"
    : patches.map((p) => `${p.key}: ${String(p.previousValue ?? "없음")} → ${String(p.newValue)}`).join(", ");

  return { patches, newSlots, summary };
}
