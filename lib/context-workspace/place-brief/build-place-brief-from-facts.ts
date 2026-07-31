/**
 * Deterministic Place Brief from Workspace node + lodging inventory facts.
 */

import type { ContextWorkspaceNode } from "@/lib/context-workspace/types";
import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import type {
  PlaceBrief,
  PlaceBriefFactPack,
  PlaceBriefKnowBefore,
} from "@/lib/context-workspace/place-brief/types";

function kindOf(node: ContextWorkspaceNode): PlaceBrief["kind"] {
  if (node.kind === "lodging") return "lodging";
  if (node.kind === "eatery") return "eatery";
  if (node.kind === "poi" || node.kind === "amenity") return "poi";
  return "other";
}

function formatYmdKo(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function amenityLabels(tags: readonly string[]): string[] {
  const map: Record<string, string> = {
    reservable: "예약 가능",
    local_favorite: "현지 추천",
    rain_safe: "실내·우천 대비",
    indoor: "실내 위주",
    stay: "숙박",
  };
  const out: string[] = [];
  for (const t of tags) {
    const key = t.trim();
    if (!key || /^(day_|part_|cluster_|source_|live_burst|ws-)/iu.test(key)) {
      continue;
    }
    const label = map[key] ?? (/^[a-z0-9_:-]+$/iu.test(key) ? null : key);
    if (label && !out.includes(label)) out.push(label);
    if (out.length >= 5) break;
  }
  return out;
}

export function buildPlaceBriefFactPack(input: {
  readonly node: ContextWorkspaceNode;
  readonly inventory?: ContextLodgingInventoryRow | null;
  readonly destinationKo?: string | null;
}): PlaceBriefFactPack {
  const { node, inventory } = input;
  const walk =
    node.summaryKo.match(/(\d+)\s*분/)?.[0] != null
      ? node.summaryKo.trim()
      : null;
  return {
    placeId: (node.placeId || node.id).trim(),
    kind: kindOf(node),
    title: node.title.trim(),
    summaryKo: node.summaryKo.trim() || null,
    amountLabel: (() => {
      const fromNode = node.amountLabel?.trim();
      if (fromNode) return fromNode;
      if (inventory?.priceKrw != null && Number.isFinite(inventory.priceKrw)) {
        return `${Math.round(inventory.priceKrw).toLocaleString("ko-KR")}원`;
      }
      return null;
    })(),
    rating: node.rating ?? inventory?.rating ?? null,
    reviewCount: node.reviewCount ?? inventory?.reviewCount ?? null,
    amenities: amenityLabels([
      ...node.tags,
      ...(inventory?.partnerLabel ? [inventory.partnerLabel] : []),
    ]),
    address: inventory?.address?.trim() || null,
    partnerLabel: inventory?.partnerLabel?.trim() || null,
    checkInIso: inventory?.checkInIso ?? inventory?.stayWindow?.checkInIso ?? null,
    checkOutIso:
      inventory?.checkOutIso ?? inventory?.stayWindow?.checkOutIso ?? null,
    destinationKo: input.destinationKo?.trim() || null,
    walkHintKo: walk,
  };
}

export function buildPlaceBriefFromFacts(
  pack: PlaceBriefFactPack,
): PlaceBrief {
  const featuresKo: string[] = [];
  if (pack.walkHintKo) {
    featuresKo.push(`동선 · ${pack.walkHintKo}`);
  }
  if (pack.destinationKo) {
    featuresKo.push(`${pack.destinationKo} 여행 후보`);
  }
  if (pack.amountLabel) {
    featuresKo.push(`요금 참고 · ${pack.amountLabel}`);
  }
  for (const a of pack.amenities) {
    if (!featuresKo.includes(a)) featuresKo.push(a);
    if (featuresKo.length >= 5) break;
  }
  if (featuresKo.length === 0 && pack.kind === "lodging") {
    featuresKo.push("숙소 · 예약 준비 가능");
  }

  const knowBefore: PlaceBriefKnowBefore[] = [];
  const cin = formatYmdKo(pack.checkInIso);
  const cout = formatYmdKo(pack.checkOutIso);
  if (cin && cout) {
    knowBefore.push({ labelKo: "일정", valueKo: `${cin} 체크인 · ${cout} 체크아웃` });
  } else if (cin) {
    knowBefore.push({ labelKo: "체크인", valueKo: cin });
  }
  if (pack.address) {
    knowBefore.push({ labelKo: "주소", valueKo: pack.address });
  }
  if (pack.partnerLabel) {
    knowBefore.push({ labelKo: "제공", valueKo: pack.partnerLabel });
  }
  if (pack.kind === "lodging") {
    knowBefore.push({
      labelKo: "결제",
      valueKo: "예약 준비 후 Workspace에서 승인 · 결제",
    });
  }

  const routeFitKo = pack.walkHintKo
    ? `이번 동선 기준 · ${pack.walkHintKo}`
    : pack.destinationKo
      ? `${pack.destinationKo} 일정과 맞춰 둔 후보`
      : null;

  const introParts: string[] = [];
  if (pack.kind === "lodging") {
    introParts.push(
      `${pack.title}은(는) ${pack.destinationKo ?? "여행지"} 숙소 후보입니다.`,
    );
  } else if (pack.kind === "eatery") {
    introParts.push(`${pack.title} · 맛집 후보입니다.`);
  } else {
    introParts.push(`${pack.title} · 일정에 올린 장소입니다.`);
  }
  if (pack.walkHintKo) {
    introParts.push(pack.walkHintKo.includes("·") ? pack.walkHintKo : `이동 ${pack.walkHintKo}.`);
  }
  if (pack.rating != null && Number.isFinite(pack.rating)) {
    const reviews =
      pack.reviewCount != null && pack.reviewCount > 0
        ? ` · 후기 ${pack.reviewCount.toLocaleString("ko-KR")}개`
        : "";
    introParts.push(`평점 ${pack.rating.toFixed(1)}${reviews}.`);
  }

  const reviewSummaryKo =
    pack.rating != null && Number.isFinite(pack.rating)
      ? pack.rating >= 4.4
        ? `평점 ${pack.rating.toFixed(1)} · 만족도가 높은 편입니다.`
        : pack.rating >= 4.0
          ? `평점 ${pack.rating.toFixed(1)} · 무난한 선택으로 평가됩니다.`
          : `평점 ${pack.rating.toFixed(1)} · 후기를 한 번 더 확인해 보세요.`
      : null;

  return {
    placeId: pack.placeId,
    kind: pack.kind,
    title: pack.title,
    routeFitKo,
    introKo: introParts.join(" ").trim() || null,
    featuresKo: featuresKo.slice(0, 5),
    reviewSummaryKo,
    atmosphereKo: null,
    knowBefore: knowBefore.slice(0, 6),
    source: "facts",
  };
}
