import { parseKoreanMoneyToNumber } from "@/lib/actions/match-user-defined-action";
import { resolveMentionNavigateDestination } from "@/lib/action-chat/mention-navigate/commit-mention-navigate-turn";
import {
  buildInlineChatActionWire,
  type InlineChatActionWire,
} from "@/lib/action-chat/mention-actions/inline-chat-action";
import { MENTION_ACTION_ICONS } from "@/lib/action-chat/mention-actions/mention-action-inline-features";
import {
  parseMentionTransferQuery,
} from "@/lib/action-chat/mention-transfer/parse-mention-transfer-query";
import { parseMentionTimerDuration } from "@/lib/action-chat/mention-timer/inline-chat-timer";
import {
  formatMentionReminderWhen,
  parseMentionReminderFireAt,
} from "@/lib/action-chat/mention-reminder/parse-mention-reminder-query";
import { resolvePluginDeeplink } from "@/lib/action-spawn/resolve-plugin-deeplink";
import type { MentionFeature } from "@/lib/event-kernel/action-contracts/mention-feature-registry";
import {
  buildKakaoMapSearchHref,
  buildNaverMapSearchHref,
  buildNaverMapSearchWebHref,
} from "@/lib/resolvers/deep-links";

const PHONE_PATTERN = /(?:\+?\d[\d\s-]{7,}\d)/u;
const URL_PATTERN = /^https?:\/\//iu;
const PARCEL_PATTERN = /\d{10,14}/u;

const FX_RATES_WON: Record<string, number> = {
  usd: 1350,
  dollar: 1350,
  달러: 1350,
  eur: 1480,
  euro: 1480,
  유로: 1480,
  jpy: 9,
  yen: 9,
  엔: 9,
  cny: 185,
  yuan: 185,
  위안: 185,
};

function formatWon(value: number): string {
  return `${value.toLocaleString("ko-KR")}원`;
}

function encodeSearch(query: string): string {
  return encodeURIComponent(query.trim());
}

function parsePhoneNumber(query: string): string | null {
  const match = query.match(PHONE_PATTERN);
  if (!match) {
    return null;
  }
  return match[0]!.replace(/\s+/g, "").replace(/-/g, "");
}

function parseFxAmount(query: string): { amount: number; currency: string; rate: number } | null {
  const trimmed = query.trim();
  if (!trimmed) {
    return null;
  }
  const amountMatch = trimmed.match(/(\d+(?:\.\d+)?)/u);
  if (!amountMatch) {
    return null;
  }
  const amount = Number.parseFloat(amountMatch[1] ?? "");
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }
  const lower = trimmed.toLowerCase();
  for (const [key, rate] of Object.entries(FX_RATES_WON)) {
    if (lower.includes(key)) {
      return { amount, currency: key, rate };
    }
  }
  if (/달러|usd|dollar/iu.test(trimmed)) {
    return { amount, currency: "USD", rate: FX_RATES_WON.usd! };
  }
  return { amount, currency: "USD", rate: FX_RATES_WON.usd! };
}

function parseTipAmount(query: string): number | null {
  const won = parseKoreanMoneyToNumber(query);
  if (won != null) {
    return won;
  }
  const digits = query.replace(/[^\d]/g, "");
  if (!digits) {
    return null;
  }
  const value = Number.parseInt(digits, 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function buildTipSummary(amount: number): string[] {
  return [10, 15, 18].map((rate) => {
    const tip = Math.round(amount * (rate / 100));
    return `${rate}% · ${formatWon(tip)} (합계 ${formatWon(amount + tip)})`;
  });
}

function buildReminderSummary(query: string, referenceDate: string): string[] {
  if (!query.trim()) {
    return [];
  }
  const fireAt = parseMentionReminderFireAt(query, referenceDate);
  if (fireAt) {
    return [`알림 시각 ${formatMentionReminderWhen(fireAt)}`, query.trim()];
  }
  return [query.trim()];
}

function resolveDestination(query: string, fallback: string): string {
  return resolveMentionNavigateDestination(query) ?? (query.trim() || fallback);
}

export function buildMentionActionWire(input: {
  feature: MentionFeature;
  query: string;
  referenceDate?: string;
  lastAction?: {
    featureId: string;
    query: string;
    mainDeeplink?: string;
    mainLabel: string;
  } | null;
}): InlineChatActionWire | null {
  const { feature, query } = input;
  const referenceDate = input.referenceDate ?? new Date().toISOString().slice(0, 10);
  const icon = MENTION_ACTION_ICONS[feature.featureId] ?? "⚡";
  const q = query.trim();

  switch (feature.featureId) {
    case "weather": {
      const place = q || "서울";
      const naver = `https://search.naver.com/search.naver?query=${encodeSearch(`${place} 날씨`)}`;
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: q,
        summaryLines: q ? [`${place} 날씨`] : ["지역을 적어 주세요. 예: @날씨 서울"],
        mainLabel: `${place} 날씨`,
        mainDeeplink: naver,
        auxActions: [
          {
            id: "google",
            label: "Google",
            icon: "G",
            deeplink: `https://www.google.com/search?q=${encodeSearch(`${place} weather`)}`,
          },
        ],
      });
    }

    case "price": {
      const item = q || "상품";
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: q,
        summaryLines: q ? [`${item} 가격 비교`] : ["무엇의 가격을 볼까요?"],
        mainLabel: "네이버 쇼핑",
        mainDeeplink: `https://search.shopping.naver.com/search/all?query=${encodeSearch(item)}`,
        auxActions: [
          {
            id: "coupang",
            label: "쿠팡",
            icon: "C",
            deeplink: `https://www.coupang.com/np/search?q=${encodeSearch(item)}`,
          },
          {
            id: "danawa",
            label: "다나와",
            icon: "D",
            deeplink: `https://search.danawa.com/dsearch.php?query=${encodeSearch(item)}`,
          },
        ],
      });
    }

    case "taxi": {
      const dest = resolveDestination(q, "강남역");
      const taxi =
        resolvePluginDeeplink("kakao.taxi", { destination: dest, label: dest }) ??
        `https://taxi.kakao.com/?dest=${encodeSearch(dest)}`;
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: q,
        summaryLines: [`목적지 ${dest}`],
        mainLabel: "카카오T 호출",
        mainDeeplink: taxi,
        auxActions: [
          {
            id: "nav",
            label: "길찾기",
            icon: "🧭",
            deeplink: buildKakaoMapSearchHref(dest),
          },
        ],
      });
    }

    case "phone": {
      const phone = parsePhoneNumber(q);
      const mainDeeplink = phone
        ? `tel:${phone}`
        : `https://www.google.com/search?q=${encodeSearch(`${q} 전화번호`)}`;
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: q,
        summaryLines: phone
          ? [`${phone} 전화`]
          : q
            ? [`${q} 검색 후 전화`]
            : ["번호나 가게 이름을 적어 주세요."],
        mainLabel: phone ? "전화 걸기" : "번호 찾기",
        mainDeeplink,
      });
    }

    case "paste":
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: q,
        summaryLines: ["클립보드 내용을 읽어 주소·링크·번호에 맞게 연결합니다."],
        mainLabel: "클립보드 읽기",
        mainActionKind: "clipboard",
      });

    case "parcel": {
      const tracking = q.match(PARCEL_PATTERN)?.[0] ?? q;
      const cj = tracking
        ? `https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=${encodeURIComponent(tracking)}`
        : "https://www.cjlogistics.com/ko/tool/parcel/tracking";
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: q,
        summaryLines: tracking ? [`송장 ${tracking}`] : ["송장 번호를 적어 주세요."],
        mainLabel: "CJ대한통운",
        mainDeeplink: cj,
        auxActions: [
          {
            id: "lotte",
            label: "롯데",
            icon: "L",
            deeplink: `https://www.lotteglogis.com/home/reservation/tracking/index?InvNo=${encodeURIComponent(tracking)}`,
          },
        ],
      });
    }

    case "link": {
      const url = URL_PATTERN.test(q) ? q : "";
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: q,
        summaryLines: url ? [url] : ["URL을 붙여 넣거나 적어 주세요."],
        mainLabel: url ? "링크 열기" : "클립보드에서 URL",
        mainDeeplink: url || undefined,
        mainActionKind: url ? "deeplink" : "clipboard",
      });
    }

    case "dutch": {
      const transfer = parseMentionTransferQuery(q);
      const summary = transfer.dutchSummary
        ? [
            `총액 ${formatWon(transfer.dutchSummary.totalWon)}`,
            `인원 ${transfer.dutchSummary.headcount}명`,
            `1인당 ${formatWon(transfer.dutchSummary.perPersonWon)}`,
          ]
        : ["예: @더치 84000 4명"];
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: q,
        summaryLines: summary,
        mainLabel:
          transfer.amountWon != null && transfer.dutchSummary
            ? `1인 ${formatWon(transfer.dutchSummary.perPersonWon)}`
            : "더치페이 계산",
        mainDeeplink:
          transfer.provider === "kakaopay"
            ? "https://link.kakaopay.com/bridge/wallet/home"
            : "https://toss.me/",
        auxActions: [
          {
            id: "transfer",
            label: "송금",
            icon: "💸",
            deeplink: "https://toss.me/",
          },
        ],
      });
    }

    case "delivery": {
      const keyword = q || "치킨";
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: q,
        summaryLines: [`${keyword} 배달`],
        mainLabel: "배민",
        mainDeeplink: `https://www.baemin.com/search?q=${encodeSearch(keyword)}`,
        auxActions: [
          {
            id: "coupang",
            label: "쿠팡이츠",
            icon: "C",
            deeplink: `https://www.coupangeats.com/mobile/search?q=${encodeSearch(keyword)}`,
          },
        ],
      });
    }

    case "pickup": {
      const place = q || "스타벅스";
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: q,
        summaryLines: [`${place} 픽업`],
        mainLabel: "픽업 주문",
        mainDeeplink:
          resolvePluginDeeplink("order.pickup", { label: place }) ??
          `https://www.google.com/search?q=${encodeSearch(`${place} 픽업 주문`)}`,
        auxActions: [
          {
            id: "map",
            label: "지도",
            icon: "🗺",
            deeplink: buildKakaoMapSearchHref(place),
          },
        ],
      });
    }

    case "tip": {
      const amount = parseTipAmount(q);
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: q,
        summaryLines: amount ? buildTipSummary(amount) : ["예: @팁 35000"],
        mainLabel: amount ? formatWon(amount) : "팁 계산",
        mainActionKind: "internal",
      });
    }

    case "exchange": {
      const fx = parseFxAmount(q);
      const lines =
        fx != null
          ? [`${fx.amount} → 약 ${formatWon(Math.round(fx.amount * fx.rate))}`]
          : ["예: @환율 100달러"];
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: q,
        summaryLines: lines,
        mainLabel: "환율 검색",
        mainDeeplink: "https://finance.naver.com/marketindex/exchangeList.naver",
      });
    }

    case "gas": {
      const area = q || "주유소";
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: q,
        summaryLines: [`${area} 최저가 주유소`],
        mainLabel: "네이버 지도",
        mainDeeplink: buildNaverMapSearchWebHref(`${area} 주유소`),
        auxActions: [
          {
            id: "kakao",
            label: "카카오맵",
            icon: "K",
            deeplink: buildKakaoMapSearchHref(`${area} 주유소`),
          },
        ],
      });
    }

    case "commute": {
      const dest = resolveDestination(q, "회사");
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: q,
        summaryLines: ["출근 길", `목적지 ${dest}`],
        mainLabel: "출근 길찾기",
        mainDeeplink: buildKakaoMapSearchHref(dest),
        auxActions: [
          {
            id: "transit",
            label: "대중교통",
            icon: "🚇",
            deeplink: buildNaverMapSearchHref(dest),
          },
        ],
      });
    }

    case "leave": {
      const home = resolveDestination(q, "집");
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: q,
        summaryLines: ["퇴근 길", `목적지 ${home}`],
        mainLabel: "퇴근 길찾기",
        mainDeeplink: buildKakaoMapSearchHref(home),
        auxActions: [
          {
            id: "taxi",
            label: "택시",
            icon: "T",
            deeplink:
              resolvePluginDeeplink("kakao.taxi", { destination: home, label: home }) ??
              `https://taxi.kakao.com/?dest=${encodeSearch(home)}`,
          },
        ],
      });
    }

    case "water": {
      const interval = q.match(/(\d+)\s*(?:시간|hour|h)/iu)?.[1] ?? "2";
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: q,
        summaryLines: [`${interval}시간마다 물 마시기 알림`],
        mainLabel: "물 마시기 알림",
        mainDeeplink: `glango://reminder/create?title=${encodeSearch("물 마시기")}&intervalHours=${interval}`,
      });
    }

    case "exercise": {
      const duration = parseMentionTimerDuration(q) ?? 30 * 60;
      const minutes = Math.round(duration / 60);
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: q,
        summaryLines: [`${minutes}분 운동`],
        mainLabel: `${minutes}분 타이머`,
        mainDeeplink: `glango://mention/timer?duration=${duration}`,
      });
    }

    case "lunch": {
      const fireAt = parseMentionReminderFireAt(q || "12시 30분", referenceDate);
      const when = fireAt ? formatMentionReminderWhen(fireAt) : null;
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: q,
        summaryLines: when ? [`점심 알림 ${when}`] : ["12:30 점심 알림"],
        mainLabel: "점심 알림",
        mainDeeplink: `glango://reminder/create?title=${encodeSearch("점심")}&query=${encodeSearch(q || "12시 30분")}`,
      });
    }

    case "memo":
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: q,
        summaryLines: q ? [q] : ["메모 내용을 적어 주세요."],
        mainLabel: q ? "메모 저장" : "메모 작성",
        mainActionKind: "internal",
      });

    case "todo":
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: q,
        summaryLines: buildReminderSummary(q, referenceDate).length
          ? buildReminderSummary(q, referenceDate)
          : q
            ? [q]
            : ["할 일을 적어 주세요."],
        mainLabel: "할 일 알림",
        mainDeeplink: `glango://reminder/create?title=${encodeSearch(q || "할 일")}`,
      });

    case "receipt":
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: q,
        summaryLines: ["영수증 촬영 후 금액·날짜를 확인합니다."],
        mainLabel: "영수증 촬영",
        mainActionKind: "capture",
      });

    case "coupon":
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: q,
        summaryLines: buildReminderSummary(q, referenceDate).length
          ? ["쿠폰 만료 알림", ...buildReminderSummary(q, referenceDate)]
          : q
            ? [q]
            : ["만료일과 내용을 적어 주세요."],
        mainLabel: "쿠폰 알림",
        mainDeeplink: `glango://reminder/create?title=${encodeSearch(`쿠폰 ${q}`)}`,
      });

    case "umbrella": {
      const place = q || "서울";
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: q,
        summaryLines: [`${place} 강수 확률 확인`],
        mainLabel: "우산 필요?",
        mainDeeplink: `https://search.naver.com/search.naver?query=${encodeSearch(`${place} 강수확률`)}`,
      });
    }

    case "translate": {
      const text = q || "";
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: q,
        summaryLines: text ? [text.slice(0, 80)] : ["번역할 문장을 적어 주세요."],
        mainLabel: "Papago",
        mainDeeplink: text
          ? `https://papago.naver.com/?sk=ko&tk=en&st=${encodeSearch(text)}`
          : "https://papago.naver.com/",
      });
    }

    case "station": {
      const station = q || "강남역";
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: q,
        summaryLines: [`${station} 도착 정보`],
        mainLabel: "네이버 지하철",
        mainDeeplink: `https://map.naver.com/p/search/${encodeSearch(station)}`,
        auxActions: [
          {
            id: "kakao",
            label: "카카오맵",
            icon: "K",
            deeplink: buildKakaoMapSearchHref(station),
          },
        ],
      });
    }

    case "now":
      if (input.lastAction) {
        return buildInlineChatActionWire({
          featureId: feature.featureId,
          displayName: feature.displayName,
          icon,
          query: input.lastAction.query,
          summaryLines: [`직전 ${input.lastAction.mainLabel}`],
          mainLabel: input.lastAction.mainLabel,
          mainDeeplink: input.lastAction.mainDeeplink,
        });
      }
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: q,
        summaryLines: ["가장 최근 액션이 없어요."],
        mainLabel: "오늘 일정",
        mainDeeplink: "glango://calendar/today",
      });

    case "retry":
      if (!input.lastAction) {
        return buildInlineChatActionWire({
          featureId: feature.featureId,
          displayName: feature.displayName,
          icon,
          query: q,
          summaryLines: ["다시 실행할 직전 액션이 없어요."],
          mainLabel: "액션 목록",
          mainDeeplink: "glango://actions",
        });
      }
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: input.lastAction.query,
        summaryLines: [`다시 실행 · ${input.lastAction.mainLabel}`],
        mainLabel: input.lastAction.mainLabel,
        mainDeeplink: input.lastAction.mainDeeplink,
      });

    case "capture":
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: q,
        summaryLines: ["촬영 후 OCR·맛집·영수증으로 분기합니다."],
        mainLabel: "촬영하기",
        mainActionKind: "capture",
      });

    case "dnd": {
      const duration = parseMentionTimerDuration(q) ?? 60 * 60;
      const minutes = Math.round(duration / 60);
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: q,
        summaryLines: [`${minutes}분 방해금지`],
        mainLabel: "집중 모드",
        mainDeeplink: `glango://mention/focus?duration=${duration}`,
      });
    }

    default:
      return null;
  }
}
