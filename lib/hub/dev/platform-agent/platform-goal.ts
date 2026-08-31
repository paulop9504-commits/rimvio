/**
 * Platform Goal — structured user intent separate from currentPlatform (P1).
 */

import type { UserIntent } from "@/lib/agent/conversation/intent-types";

export type PlatformGoalKind = "create" | "modify" | "inspect" | "test" | "connect" | "publish";

export type PlatformGoalScope =
  | { readonly kind: "new_platform" }
  | { readonly kind: "existing_platform"; readonly platformName: string }
  | { readonly kind: "code_direct"; readonly targetPath?: string; readonly targetSymbol?: string; readonly targetCapability?: string };

export type PlatformGoal = {
  readonly intent: UserIntent;
  /** P1 — create vs modify vs inspect for Planner routing */
  readonly goalKind: PlatformGoalKind;
  readonly summary: string;
  readonly summaryKo: string;
  readonly scope: PlatformGoalScope;
  readonly domain: string | null;
  readonly requestedCapabilities: readonly string[];
  readonly flows: readonly string[];
  readonly ready: boolean;
  readonly clarificationKo: string | null;
};

const HOTEL_BOOKING_CAPS = [
  "hotel.search",
  "hotel.detail",
  "room.availability",
  "booking.prepare",
  "booking.confirm",
  "booking.cancel",
  "payment.prepare",
  "payment.commit",
] as const;

const DELIVERY_MARKETPLACE_CAPS = [
  "search",
  "map",
  "restaurant.list",
  "menu.list",
  "cart",
  "order.create",
  "order.status",
  "payment.prepare",
  "delivery",
  "filter",
] as const;

const FOOD_ORDER_LOOPS = [
  "food_discovery_loop",
  "food_order_loop",
  "food_delivery_loop",
] as const;

const REFUND_RELATED = ["booking.cancel", "payment.refund", "payment.commit", "payment.prepare"] as const;

function normalize(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function extractAtCapability(text: string): string | null {
  const m = text.match(/@([a-z][a-z0-9_.]+)/i);
  return m?.[1] ?? null;
}

function extractFilePath(text: string): string | null {
  const m = text.match(/([a-z0-9_./-]+\.(?:ts|tsx|js|json))\b/i);
  return m?.[1] ?? null;
}

function extractSymbol(text: string): string | null {
  const m = text.match(/([a-z][a-zA-Z0-9]+)\s*함수/i) ?? text.match(/function\s+([a-zA-Z0-9_]+)/);
  return m?.[1] ?? null;
}

function goalKindFromIntent(intent: UserIntent): PlatformGoalKind {
  if (intent === "create" || intent === "modify") return intent;
  if (intent === "inspect" || intent === "test" || intent === "connect" || intent === "publish") {
    return intent;
  }
  return "modify";
}

function withGoalKind(partial: Omit<PlatformGoal, "goalKind">, intent: UserIntent): PlatformGoal {
  return { ...partial, goalKind: goalKindFromIntent(intent) };
}

/** Compile utterance + intent into structured Platform Goal. */
export function compilePlatformGoal(input: {
  readonly utterance: string;
  readonly intent: UserIntent;
  readonly platformName?: string | null;
}): PlatformGoal {
  const text = normalize(input.utterance);
  const platformName = input.platformName?.trim() || "Platform";

  const atCap = extractAtCapability(text);
  const filePath = extractFilePath(text);
  const symbol = extractSymbol(text);

  if (atCap || (filePath && input.intent === "modify")) {
    return withGoalKind(
      {
        intent: input.intent,
        summary: text,
        summaryKo: atCap ? `@${atCap} 코드 수정` : `${filePath} 수정`,
        scope: {
          kind: "code_direct",
          targetPath: filePath ?? undefined,
          targetSymbol: symbol ?? undefined,
          targetCapability: atCap ?? undefined,
        },
        domain: null,
        requestedCapabilities: atCap ? [atCap] : [],
        flows: [],
        ready: true,
        clarificationKo: null,
      },
      input.intent,
    );
  }

  const isNewPlatform =
    /새로운?\s*호텔|호텔\s*예약\s*플랫폼|hotel\s*booking\s*platform|플랫폼\s*만들/i.test(text) &&
    !new RegExp(platformName, "i").test(text);

  const wantsHotelPlatform =
    /호텔\s*예약|hotel\s*booking|검색.*예약.*결제|search.*book.*pay/i.test(text);

  const wantsDeliveryPlatform =
    /배달|delivery\s*(platform|app|marketplace)|음식점|음식\s*주문|restaurant\s*order|food\s*platform|food\s*order/i.test(text);

  const wantsRefundFlow = /취소.*환불|환불|refund|cancel.*refund/i.test(text);

  const wantsSort = /가격순|price\s*sort|rating\s*sort|정렬/i.test(text);

  if (input.intent === "create") {
    const vague = /새로\s*(플랫폼|프로젝트)|플랫폼을?\s*(개발|만들)|새\s*플랫폼/i.test(text);
    const specific = wantsHotelPlatform || wantsDeliveryPlatform || text.length > 30;
    if (vague && !specific) {
      return withGoalKind(
        {
          intent: input.intent,
          summary: text,
          summaryKo: "새 Platform 생성",
          scope: { kind: "new_platform" },
          domain: null,
          requestedCapabilities: [],
          flows: [],
          ready: false,
          clarificationKo:
            "좋아요. 어떤 플랫폼을 만들고 싶으신가요? 예: 일본 여행자를 위한 호텔 예약 플랫폼",
        },
        input.intent,
      );
    }
    return withGoalKind(
      {
        intent: input.intent,
        summary: text,
        summaryKo: wantsDeliveryPlatform
          ? "Food / 배달 주문 Platform 생성"
          : wantsHotelPlatform
            ? "호텔 예약 Platform 생성"
            : "새 Platform 생성",
        scope: { kind: "new_platform" },
        domain: wantsDeliveryPlatform ? "food_order" : wantsHotelPlatform ? "hotel_booking" : null,
        requestedCapabilities: wantsDeliveryPlatform
          ? [...DELIVERY_MARKETPLACE_CAPS]
          : wantsHotelPlatform
            ? [...HOTEL_BOOKING_CAPS]
            : [],
        flows: wantsDeliveryPlatform
          ? [...FOOD_ORDER_LOOPS]
          : wantsHotelPlatform
            ? ["search → detail → availability → booking → payment"]
            : [],
        ready: true,
        clarificationKo: null,
      },
      input.intent,
    );
  }

  if (wantsRefundFlow) {
    return withGoalKind(
      {
        intent: input.intent,
        summary: text,
        summaryKo: "예약 취소 시 자동 환불",
        scope: { kind: "existing_platform", platformName },
        domain: "hotel_booking",
        requestedCapabilities: [...REFUND_RELATED],
        flows: ["booking.cancel → payment.refund"],
        ready: true,
        clarificationKo: null,
      },
      input.intent,
    );
  }

  if (wantsSort && /hotel\.search|호텔\s*검색/i.test(text)) {
    return withGoalKind(
      {
        intent: input.intent,
        summary: text,
        summaryKo: "hotel.search 가격순 정렬",
        scope: { kind: "existing_platform", platformName },
        domain: "hotel_booking",
        requestedCapabilities: ["hotel.search"],
        flows: [],
        ready: true,
        clarificationKo: null,
      },
      input.intent,
    );
  }

  if (isNewPlatform) {
    return withGoalKind(
      {
        intent: input.intent,
        summary: text,
        summaryKo: "호텔 예약 Platform 생성",
        scope: { kind: "new_platform" },
        domain: "hotel_booking",
        requestedCapabilities: [...HOTEL_BOOKING_CAPS],
        flows: ["search → detail → booking → payment"],
        ready: true,
        clarificationKo: null,
      },
      input.intent,
    );
  }

  return withGoalKind(
    {
      intent: input.intent,
      summary: text,
      summaryKo: text.slice(0, 60),
      scope: { kind: "existing_platform", platformName },
      domain: null,
      requestedCapabilities: [],
      flows: [],
      ready: true,
      clarificationKo: null,
    },
    input.intent,
  );
}

export type AgentExecutionMode = "platform" | "code_direct";

export function executionModeFromGoal(goal: PlatformGoal): AgentExecutionMode {
  return goal.scope.kind === "code_direct" ? "code_direct" : "platform";
}

/** Summarize goal for Activity / work log (Cursor-style terse). */
export function summarizePlatformGoal(goal: PlatformGoal): string {
  if (goal.goalKind === "create") return `Create · ${goal.summaryKo}`;
  if (goal.goalKind === "modify") return `Modify · ${goal.summaryKo}`;
  if (goal.goalKind === "inspect") return `Inspect · ${goal.summaryKo}`;
  return goal.summaryKo;
}

