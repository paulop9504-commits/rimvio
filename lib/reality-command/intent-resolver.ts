/**
 * Intent Resolver — NL → Reality Command Intent.
 *
 * Actions: filter · replace · move · compare · optimize · simulate · prepare
 */

import type {
  RealityCommandAction,
  RealityCommandConstraint,
  RealityCommandIntent,
} from "@/lib/reality-command/types";

function intent(
  action: RealityCommandAction,
  target: string,
  constraint: RealityCommandConstraint = {},
): RealityCommandIntent {
  return { action, target, constraint };
}

export function looksLikeRealityCommitCommand(text: string): boolean {
  return /지구에\s*남|reality\s*commit|커밋|확정\s*결제|commit\s*globe/iu.test(
    text.trim(),
  );
}

/**
 * Resolve user NL into Reality Intent.
 *
 * "캡슐호텔만 보여줘" →
 *   { target: "Hotel", action: "filter", constraint: { type: "capsule" } }
 */
export function resolveRealityCommandIntent(
  text: string,
): RealityCommandIntent | null {
  const raw = text.trim();
  if (!raw) return null;
  if (looksLikeRealityCommitCommand(raw)) return null;

  // prepare
  if (/예약\s*준비|prepare|준비\s*해|액션\s*준비/iu.test(raw)) {
    return intent("prepare", "Hotel", { labelKo: "예약 준비" });
  }

  // optimize
  if (/최적화|optimize|동선\s*최적화|가성비\s*최적/iu.test(raw)) {
    return intent("optimize", "Route", {
      optimizeRoute: true,
      utterance: raw,
    });
  }

  // simulate
  if (
    /바꾸면\s*영향|영향\s*알려|시뮬레이션|what\s*-?\s*if|만약/iu.test(raw)
  ) {
    return intent("simulate", "Hotel", { scenarioKo: raw });
  }

  // compare
  if (/두\s*호텔\s*비교|호텔\s*비교|비교해|compare/iu.test(raw)) {
    return intent("compare", "Hotel", {});
  }

  // replace / change hotel
  if (
    /호텔\s*바꿔|숙소\s*바꿔|다른\s*호텔|호텔\s*변경|바꿔\s*줘|change\s*hotel|replace\s*hotel|더\s*싼\s*호텔/iu.test(
      raw,
    )
  ) {
    return intent("replace", "Hotel", {
      findSimilar: true,
      utterance: raw,
    });
  }

  // move
  if (
    /옮겨|이동해|우메다로|일정\s*넣|move\s*hotel|호텔을\s*.+로/iu.test(raw) ||
    (/옮겨|이동|move/iu.test(raw) && /호텔|숙소|일정/u.test(raw))
  ) {
    const dest =
      raw.match(/(우메다|난바|도톤보리|umeda|namba)/iu)?.[1] ?? null;
    return intent("move", "Hotel", {
      destination: dest,
      utterance: raw,
    });
  }

  // filter — capsule (primary example)
  if (
    /캡슐\s*호텔|capsule\s*hotel|캡슐만|capsule\s*only/iu.test(raw) ||
    (/캡슐/u.test(raw) && /보여|보고\s*싶|만\s*보/u.test(raw))
  ) {
    return intent("filter", "Hotel", {
      type: "capsule",
      hotelType: "capsule",
      category: "capsule",
    });
  }

  // filter — cheap
  if (/저렴한?\s*호텔|싼\s*호텔|가성비\s*호텔|cheap\s*hotel/iu.test(raw)) {
    return intent("filter", "Hotel", {
      type: "budget",
      maxPriceBand: 2,
    });
  }

  // filter — near
  if (
    /가까운\s*곳|근처|역세권|near|가까이/iu.test(raw) ||
    /난바|namba|역\s*가깝/iu.test(raw)
  ) {
    const station =
      raw.match(/(난바|도톤보리|신사이바시|우메다|오사카|namba)[역\s]*/iu)?.[1] ??
      "근처";
    return intent("filter", "Hotel", {
      type: "near",
      near: station,
      stationNear: true,
    });
  }

  // generic "만 보여/보고"
  if (/만\s*(보여|보고\s*싶|보여\s*줘)/u.test(raw)) {
    return intent("filter", "Hotel", {
      type: "custom",
      utterance: raw,
    });
  }

  return null;
}

export function formatRealityIntentPreviewKo(
  intent: RealityCommandIntent,
): string {
  const c = intent.constraint;
  if (intent.action === "filter" && c.type === "capsule") {
    return `Hotel · filter · capsule만 표시`;
  }
  if (intent.action === "replace") {
    return `Hotel · replace · 대체안 제안`;
  }
  if (intent.action === "move") {
    return `Hotel · move · ${String(c.destination ?? "위치 변경")}`;
  }
  if (intent.action === "compare") {
    return `Hotel · compare · 비교 준비`;
  }
  if (intent.action === "optimize") {
    return `Route · optimize · 동선 최적화`;
  }
  if (intent.action === "simulate") {
    return `Hotel · simulate · 영향 예측`;
  }
  if (intent.action === "prepare") {
    return `Hotel · prepare · 예약 준비 Draft`;
  }
  return `${intent.target} · ${intent.action}`;
}
