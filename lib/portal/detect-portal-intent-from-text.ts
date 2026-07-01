import {
  isBareMarketComposeInput,
  isMarketComposeInput,
} from "@/lib/globe/market/detect-market-compose-input";
import { detectAmbientMarketInterest } from "@/lib/portal/compose-intent/classify-compose-intent";
import { normalizeMarketIntentFromText } from "@/lib/globe/market/normalize-market-intent-from-text";
import type { PortalCategoryId, PortalIntentId } from "@/lib/portal/portal-types";

export type DetectedPortalIntent = {
  intentId: PortalIntentId;
  categoryId: PortalCategoryId | null;
};

const TOGETHER_SIGNAL =
  /(?:함께(?:\s*하|할|해|요|기)?|같이(?:\s*하|할|해|요)?|동행|스터디|운동\s*같이|모임(?:\s*(?:만|할|구|해))?|meetup|companion)/iu;
const JOIN_SIGNAL =
  /(?:참여(?:\s*(?:하|할|해|요))?|참가(?:\s*(?:하|할|해|요))?|신청(?:\s*(?:하|할|해|요))?|행사(?:\s*(?:참|가|찾|알|볼|갈|에))?|공연(?:\s*(?:볼|갈|참|감|티켓|에))?|페스티벌|콘서트|join)/iu;
const SEEKING_SIGNAL = /(?:삽니다|구합니다|구해|구함|구하기|구매|구입|찾아요|찾습니다|wanted)/iu;
const LISTING_SIGNAL = /(?:팔(?:고|아|래|아요)?|팝니다|판매|나눔|양도|내놓|sell)/iu;

function readMarketRoleFromText(text: string): "listing" | "seeking" {
  if (SEEKING_SIGNAL.test(text)) {
    return "seeking";
  }
  if (LISTING_SIGNAL.test(text)) {
    return "listing";
  }
  return "listing";
}

function inferTogetherCategory(text: string): PortalCategoryId {
  if (/(?:운동|러닝|헬스|축구|농구|sport)/iu.test(text)) {
    return "sport";
  }
  if (/(?:스터디|공부|study)/iu.test(text)) {
    return "study";
  }
  if (/(?:프로젝트|project)/iu.test(text)) {
    return "project";
  }
  if (/(?:모임|밥|술|meetup)/iu.test(text)) {
    return "meetup";
  }
  return "companion";
}

function inferJoinCategory(text: string): PortalCategoryId {
  if (/(?:티켓|공연|concert|콘서트)/iu.test(text)) {
    return "ticket";
  }
  return "event";
}

function detectMarketPortalIntent(text: string): DetectedPortalIntent | null {
  if (!isMarketComposeInput(text) && !isBareMarketComposeInput(text)) {
    return null;
  }
  const normalized = normalizeMarketIntentFromText({
    text,
    eventId: "probe",
  });
  const role = normalized?.role ?? readMarketRoleFromText(text);
  return {
    intentId: role === "seeking" ? "seek" : "offer",
    categoryId: "used_goods",
  };
}

/** NL / @중고 → Portal macro intent (offer · seek · together · join). */
export function detectPortalIntentFromText(raw: string): DetectedPortalIntent | null {
  const text = raw.trim();
  if (!text) {
    return null;
  }

  const market = detectMarketPortalIntent(text);
  if (market) {
    return market;
  }

  if (JOIN_SIGNAL.test(text) && !TOGETHER_SIGNAL.test(text)) {
    return {
      intentId: "join",
      categoryId: inferJoinCategory(text),
    };
  }

  if (TOGETHER_SIGNAL.test(text)) {
    return {
      intentId: "together",
      categoryId: inferTogetherCategory(text),
    };
  }

  if (detectAmbientMarketInterest(text)) {
    return {
      intentId: "offer",
      categoryId: "used_goods",
    };
  }

  return null;
}
