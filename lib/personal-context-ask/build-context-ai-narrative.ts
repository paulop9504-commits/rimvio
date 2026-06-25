import {
  joinKoreanAnd,
  withGwaJosa,
} from "@/lib/personal-context-ask/enrich-bridge-context-facts";
import type {
  ParsedPersonalContextQuery,
  PersonalContextAskRecallContext,
  PersonalContextBridgeHit,
} from "@/lib/personal-context-ask/personal-context-ask-types";

export type ContextAiNarrative = {
  /** Full multi-paragraph narrative. */
  narrativeKo: string;
  /** First paragraph — compact preview. */
  summaryKo: string;
};

function formatYearMonth(iso: string | null): string | null {
  if (!iso) {
    return null;
  }
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    return null;
  }
  const date = new Date(ms);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

function primaryPerson(
  parsed: ParsedPersonalContextQuery,
  hit: PersonalContextBridgeHit,
): string | null {
  return parsed.personNeedles[0] ?? hit.people[0] ?? null;
}

function primaryPlace(
  parsed: ParsedPersonalContextQuery,
  hit: PersonalContextBridgeHit,
): string | null {
  return hit.place ?? parsed.placeNeedles[0] ?? null;
}

function contextLabel(hit: PersonalContextBridgeHit): string {
  return hit.contextKind ?? "맥락";
}

function buildPeriodSentence(
  hit: PersonalContextBridgeHit,
  place: string | null,
): string | null {
  const ym = formatYearMonth(hit.atIso);
  if (!ym) {
    return null;
  }

  const placeLabel = place?.trim();
  if (hit.dwellDays && placeLabel) {
    return `${ym}에 ${hit.dwellDays}일 동안 ${placeLabel}에 머물렀고`;
  }
  if (hit.dwellDays) {
    return `${ym}에 ${hit.dwellDays}일 동안 머물렀고`;
  }
  if (placeLabel) {
    return `${ym}에 ${placeLabel}에서`;
  }
  return `${ym}에`;
}

function buildSpotSentence(hit: PersonalContextBridgeHit): string | null {
  if (hit.spotLabels.length === 0) {
    return null;
  }
  if (hit.spotLabels.length === 1) {
    return `${hit.spotLabels[0]}을 방문했네요.`;
  }
  return `${joinKoreanAnd(hit.spotLabels)}를 방문했네요.`;
}

function formatKoDateLong(iso: string | null): string | null {
  if (!iso) {
    return null;
  }
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    return null;
  }
  const date = new Date(ms);
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}년 ${m}월 ${d}일`;
}

function buildPhotoStorageParagraph(
  hit: PersonalContextBridgeHit,
  photoCount: number,
): string | null {
  if (photoCount <= 0) {
    return null;
  }
  const ym = formatYearMonth(hit.atIso);
  if (ym) {
    return `${ym}에 다녀온 여행이며\n사진 ${photoCount}장이 저장되어 있습니다.`;
  }
  return `사진 ${photoCount}장이 저장되어 있습니다.`;
}

function formatKoDateDot(iso: string | null): string | null {
  if (!iso) {
    return null;
  }
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    return null;
  }
  const date = new Date(ms);
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}.${m}.${d}`;
}

function buildVisitPhotoParagraph(
  hit: PersonalContextBridgeHit,
  photoCount: number,
): string | null {
  if (photoCount <= 0) {
    return null;
  }
  const when = formatKoDateDot(hit.atIso);
  if (when) {
    return `방문일 ${when}\n당시 사진 ${photoCount}장`;
  }
  return `당시 사진 ${photoCount}장`;
}

function buildPhotoDiscoverySentence(totalPhotoCount: number): string | null {
  if (totalPhotoCount <= 0) {
    return "사진은 아직 없어요 · 맥락은 찾았어요";
  }
  return `사진 ${totalPhotoCount}장을 발견했습니다.`;
}

function isPlaceMeetIntent(parsed: ParsedPersonalContextQuery): boolean {
  return (
    parsed.intent === "place_with_person" ||
    parsed.intent === "last_meet_place" ||
    parsed.foodRelated
  );
}

function buildWhenSentence(hit: PersonalContextBridgeHit): string | null {
  const when = formatKoDateLong(hit.atIso);
  if (!when) {
    return null;
  }
  const place = hit.place?.trim();
  if (place) {
    return `${when}에 ${place}에 다녀왔어요.`;
  }
  return `${when} 기록이에요.`;
}

function buildOpeningSentence(
  hit: PersonalContextBridgeHit,
  parsed: ParsedPersonalContextQuery,
): string {
  const person = primaryPerson(parsed, hit);
  const place = primaryPlace(parsed, hit);
  const kind = contextLabel(hit);

  if (parsed.responseFocus === "photos") {
    if (person && place) {
      return `${withGwaJosa(person)} 함께한 ${place} 여행 사진을 찾았어요.`;
    }
    if (person) {
      return `${withGwaJosa(person)} 함께 찍은 사진을 찾았어요.`;
    }
    if (place) {
      return `${place}에서 찍은 사진을 찾았어요.`;
    }
    return `저장된 사진을 찾았어요.`;
  }

  if (isPlaceMeetIntent(parsed) && person && place) {
    return `${withGwaJosa(person)} 함께 방문한 ${place}을 찾았어요.`;
  }

  if (person && place) {
    return `${withGwaJosa(person)} 함께한 ${place} ${kind}을 찾았어요.`;
  }
  if (person) {
    return `${withGwaJosa(person)} 함께한 ${kind}을 찾았어요.`;
  }
  if (place) {
    return `${place} ${kind}을 찾았어요.`;
  }
  return `${hit.headline || hit.title} 맥락을 찾았어요.`;
}

function buildPhotoSentence(photoCount: number): string | null {
  if (photoCount <= 0) {
    return null;
  }
  return `당시 촬영한 사진은 총 ${photoCount}장입니다.`;
}

function buildSingleNarrative(
  hit: PersonalContextBridgeHit,
  parsed: ParsedPersonalContextQuery,
  totalPhotoCount: number,
): string[] {
  const paragraphs: string[] = [];
  paragraphs.push(buildOpeningSentence(hit, parsed));

  if (parsed.responseFocus === "when") {
    const when = buildWhenSentence(hit);
    if (when) {
      paragraphs.push(when);
    }
    return paragraphs;
  }

  const place = primaryPlace(parsed, hit);
  const period = buildPeriodSentence(hit, place);
  const spots = buildSpotSentence(hit);

  if (parsed.responseFocus === "activity") {
    if (spots) {
      paragraphs.push(spots);
    } else if (period) {
      paragraphs.push(`${period.replace(/았고$/u, "았어요.")}`);
    }
    return paragraphs;
  }

  if (period && spots) {
    paragraphs.push(`${period}\n${spots}`);
  } else if (period) {
    paragraphs.push(`${period.replace(/았고$/u, "았어요.")}`);
  } else if (spots) {
    paragraphs.push(spots);
  }

  if (parsed.responseFocus === "photos") {
    const count = totalPhotoCount > 0 ? totalPhotoCount : hit.photoCount;
    const storage = buildPhotoStorageParagraph(hit, count);
    if (storage) {
      paragraphs.push(storage);
    } else {
      const discovery = buildPhotoDiscoverySentence(count);
      if (discovery) {
        paragraphs.push(discovery);
      }
    }
    return paragraphs;
  }

  if (isPlaceMeetIntent(parsed)) {
    const visitPhotos = buildVisitPhotoParagraph(
      hit,
      totalPhotoCount > 0 ? totalPhotoCount : hit.photoCount,
    );
    if (visitPhotos) {
      paragraphs.push(visitPhotos);
    }
    return paragraphs;
  }

  const photos = buildPhotoSentence(
    totalPhotoCount > 0 ? totalPhotoCount : hit.photoCount,
  );
  if (photos) {
    paragraphs.push(photos);
  }

  return paragraphs;
}

function pickRichestHit(
  hits: readonly PersonalContextBridgeHit[],
): PersonalContextBridgeHit {
  return [...hits].sort(
    (left, right) =>
      right.photoCount - left.photoCount ||
      Date.parse(right.atIso ?? "") - Date.parse(left.atIso ?? ""),
  )[0]!;
}

function countContextKinds(
  hits: readonly PersonalContextBridgeHit[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const hit of hits) {
    const kind = contextLabel(hit);
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }
  return counts;
}

function formatKindBreakdown(counts: Map<string, number>): string {
  const parts = [...counts.entries()].map(([kind, count]) => `${kind} ${count}건`);
  if (parts.length === 0) {
    return "";
  }
  if (parts.length === 1) {
    return `${parts[0]}이 확인됩니다.`;
  }
  const last = parts[parts.length - 1]!;
  const head = parts.slice(0, -1).join(", ");
  return `${head}과 ${last}이 확인됩니다.`;
}

function buildMultiNarrative(
  hits: readonly PersonalContextBridgeHit[],
  parsed: ParsedPersonalContextQuery,
  totalPhotoCount: number,
): string[] {
  const paragraphs: string[] = [];
  const person = parsed.personNeedles[0];
  const place = parsed.placeNeedles[0] ?? hits[0]?.place;
  const count = hits.length;

  if (person && place) {
    paragraphs.push(
      `${withGwaJosa(person)} 함께한 ${place} 관련 맥락 ${count}개를 찾았어요.`,
    );
  } else if (place) {
    paragraphs.push(`${place} 관련 맥락 ${count}개를 찾았어요.`);
  } else if (person) {
    paragraphs.push(
      `${withGwaJosa(person)} 함께한 맥락 ${count}개를 찾았어요.`,
    );
  } else {
    paragraphs.push(`관련 맥락 ${count}개를 찾았어요.`);
  }

  const breakdown = formatKindBreakdown(countContextKinds(hits));
  if (breakdown && parsed.responseFocus !== "when") {
    paragraphs.push(breakdown);
  }

  if (parsed.responseFocus === "when") {
    const latest = [...hits].sort(
      (left, right) =>
        Date.parse(right.atIso ?? "") - Date.parse(left.atIso ?? ""),
    )[0];
    const when = latest ? buildWhenSentence(latest) : null;
    if (when) {
      paragraphs.push(when);
    }
    return paragraphs;
  }

  if (parsed.responseFocus === "activity") {
    const top = hits[0];
    const spots = top ? buildSpotSentence(top) : null;
    if (spots) {
      paragraphs.push(spots);
    }
    return paragraphs;
  }

  if (parsed.responseFocus === "photos") {
    const featured = pickRichestHit(hits);
    const count = totalPhotoCount;
    const storage = buildPhotoStorageParagraph(featured, count);
    if (storage) {
      paragraphs.push(storage);
    } else {
      const discovery = buildPhotoDiscoverySentence(count);
      if (discovery) {
        paragraphs.push(discovery);
      }
    }
    return paragraphs;
  }

  const richest = pickRichestHit(hits);

  if (richest && richest.photoCount > 0) {
    const ym = formatYearMonth(richest.atIso);
    const kind = contextLabel(richest);
    const title = richest.headline || richest.title;
    paragraphs.push(
      `가장 사진이 많은 ${kind}은\n${ym ? `${ym} ` : ""}${title}입니다.`,
    );
  }

  const photos = buildPhotoSentence(totalPhotoCount);
  if (photos && hits.length > 1) {
    paragraphs.push(photos);
  }

  return paragraphs;
}

function appendRecallEmotion(
  paragraphs: readonly string[],
  recall: PersonalContextAskRecallContext | null | undefined,
): string[] {
  const next = [...paragraphs];
  const line = recall?.relationshipLine?.trim();
  if (line && !next.some((row) => row.includes(line))) {
    next.push(line);
  }
  const weather = recall?.weatherLine?.trim();
  if (weather && !next.some((row) => row.includes(weather))) {
    next.push(`그날은 ${weather}이었어요.`);
  }
  return next;
}

/** Pure format — human narrative from retrieval hits (no LLM, no guess). */
export function buildContextAiNarrative(input: {
  parsed: ParsedPersonalContextQuery;
  hits: readonly PersonalContextBridgeHit[];
  totalPhotoCount: number;
  recallContext?: PersonalContextAskRecallContext | null;
}): ContextAiNarrative {
  const { parsed, hits, totalPhotoCount, recallContext } = input;
  if (hits.length === 0) {
    return { narrativeKo: "", summaryKo: "" };
  }

  const paragraphs =
    hits.length === 1
      ? buildSingleNarrative(hits[0]!, parsed, totalPhotoCount)
      : buildMultiNarrative(hits, parsed, totalPhotoCount);

  const filtered = appendRecallEmotion(
    paragraphs.filter((row) => row.trim().length > 0),
    recallContext,
  );
  return {
    narrativeKo: filtered.join("\n\n"),
    summaryKo: filtered[0] ?? "",
  };
}
