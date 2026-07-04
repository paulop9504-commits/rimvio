import { copy } from "@/lib/copy/human-ko";
import type {
  ParsedPersonalContextQuery,
  PersonalContextAskKind,
  PersonalContextBridgeHit,
} from "@/lib/personal-context-ask/personal-context-ask-types";

function formatKoDate(iso: string | null, now: Date): string {
  if (!iso) {
    return "";
  }
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    return "";
  }
  const date = new Date(ms);
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const sameYear = y === now.getFullYear();
  return sameYear ? `${m}월 ${d}일` : `${y}년 ${m}월 ${d}일`;
}

function primaryPerson(parsed: ParsedPersonalContextQuery): string {
  return parsed.personNeedles[0] ?? "그 사람";
}

function formatLastMeet(
  hits: readonly PersonalContextBridgeHit[],
  parsed: ParsedPersonalContextQuery,
  now: Date,
): string {
  const top = hits[0]!;
  const person = primaryPerson(parsed);
  const place = top.place ?? top.title;
  const when = formatKoDate(top.atIso, now);
  if (when) {
    return `${person}님과 마지막으로 만난 곳은 ${place}예요 · ${when} 기록`;
  }
  return `${person}님과 마지막으로 만난 곳은 ${place}예요`;
}

function formatSchedule(hits: readonly PersonalContextBridgeHit[]): string {
  const n = hits.length;
  return n === 1
    ? "이번 주 일정 1건이에요"
    : `이번 주 일정 ${n}건이에요`;
}

function formatTravel(
  hits: readonly PersonalContextBridgeHit[],
  parsed: ParsedPersonalContextQuery,
  now: Date,
): string {
  const top = hits[0]!;
  const place = parsed.placeNeedles[0] ?? top.place ?? top.title;
  const yearLabel =
    parsed.year !== null ? `${parsed.year}년 ` : "";
  const when = formatKoDate(top.atIso, now);
  if (when) {
    return `${yearLabel}${place} 기록을 찾았어요 · ${when}`;
  }
  return `${yearLabel}${place} 기록을 찾았어요`;
}

function formatPlaceWithPerson(
  hits: readonly PersonalContextBridgeHit[],
  parsed: ParsedPersonalContextQuery,
  now: Date,
): string {
  const top = hits[0]!;
  const person = primaryPerson(parsed);
  const label = top.place ?? top.title;
  const when = formatKoDate(top.atIso, now);
  if (when) {
    return `${person}님과 갔던 ${label} · ${when}`;
  }
  return `${person}님과 갔던 ${label}`;
}

function formatFrequent(hits: readonly PersonalContextBridgeHit[]): string {
  const top = hits[0]!;
  const person = top.people[0] ?? "가장 자주 만난 사람";
  return `가장 자주 만난 사람은 ${person}님이에요`;
}

function withYaJosa(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return "그 사람";
  }
  const code = trimmed.charCodeAt(trimmed.length - 1);
  if (code >= 0xac00 && code <= 0xd7a3) {
    const hasBatchim = (code - 0xac00) % 28 !== 0;
    return hasBatchim ? `${trimmed}이와` : `${trimmed}와`;
  }
  return `${trimmed}와`;
}

function formatPhotoRecall(
  hits: readonly PersonalContextBridgeHit[],
  parsed: ParsedPersonalContextQuery,
  totalPhotoCount: number,
): string {
  const person = parsed.personNeedles[0];
  const place = parsed.placeNeedles[0] ?? hits[0]?.place ?? hits[0]?.title;
  const countLabel = `${totalPhotoCount}장`;

  if (person && place) {
    return `${withYaJosa(person)} ${place}에서 찍은 사진 ${countLabel}을 찾았어요`;
  }
  if (person) {
    return `${withYaJosa(person)} 찍은 사진 ${countLabel}을 찾았어요`;
  }
  if (place) {
    return `${place}에서 찍은 사진 ${countLabel}을 찾았어요`;
  }
  return `저장된 사진 ${countLabel}을 찾았어요`;
}

function formatMarketTradeRecall(
  hits: readonly PersonalContextBridgeHit[],
  parsed: ParsedPersonalContextQuery,
  now: Date,
): string {
  const top = hits[0]!;
  const product = top.marketProductName ?? parsed.productNeedles[0] ?? top.title;
  const price =
    top.marketPriceLine ??
    (top.marketRealizedPriceKrw !== null && top.marketRealizedPriceKrw !== undefined
      ? `${Math.round(top.marketRealizedPriceKrw / 10_000)}만원`
      : "가격 기록");
  const when = formatKoDate(top.atIso, now) || null;

  if (parsed.intent === "sell_price_recall") {
    return copy.globe.marketSellPriceRecallLine({
      product,
      price,
      when,
      role: top.marketRole === "seeking" ? "seeking" : "listing",
    });
  }
  return copy.globe.marketTradeRecallSummary({ product, price, when });
}

function formatGeneral(hits: readonly PersonalContextBridgeHit[]): string {
  const n = hits.length;
  return n === 1
    ? "저장된 맥락 1건을 찾았어요"
    : `저장된 맥락 ${n}건을 찾았어요`;
}

/** Pure format — one-line L1 summary from retrieval hits. */
export function formatPersonalContextReply(input: {
  parsed: ParsedPersonalContextQuery;
  hits: readonly PersonalContextBridgeHit[];
  kind: PersonalContextAskKind;
  now: Date;
  totalPhotoCount?: number;
}): string {
  const { parsed, hits, now, totalPhotoCount = 0 } = input;
  if (hits.length === 0) {
    return "";
  }

  if (parsed.intent === "photo_recall" || parsed.target === "photo") {
    return formatPhotoRecall(hits, parsed, totalPhotoCount);
  }

  switch (parsed.intent) {
    case "last_meet_place":
      return formatLastMeet(hits, parsed, now);
    case "schedule_week":
      return formatSchedule(hits);
    case "travel_recall":
      return formatTravel(hits, parsed, now);
    case "place_with_person":
      return formatPlaceWithPerson(hits, parsed, now);
    case "frequent_person":
      return formatFrequent(hits);
    case "sell_price_recall":
    case "market_trade_recall":
      return formatMarketTradeRecall(hits, parsed, now);
    default:
      return formatGeneral(hits);
  }
}

export function formatExternalSoonReply(): string {
  return "밖 지구는 공개 맥락에서 기회를 연결하는 중이에요 · 맞춤·모임·거래가 곧 이어져요";
}

export function formatPhotoEmptyReply(): string {
  return "맥락은 있지만 사진은 아직 없어요";
}

export function formatEmptyReply(): string {
  return "저장된 맥락에서 찾지 못했어요 · 흔적을 남기면 다음부터 답할 수 있어요";
}

export function formatStarterReply(): string {
  return "짧게 말해 주세요 · 오사카 일정, 난바 맛집, 정성이랑 어디 갔어처럼 바로 도와드릴게요";
}
