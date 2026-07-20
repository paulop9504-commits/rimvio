import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ContextPackLodgingDiff } from "@/lib/context-builder/build-context-pack";
import {
  readLodgingBookingSlots,
  type LodgingBookingSlots,
} from "@/lib/globe/context-hub/lodging-booking-slots";
import {
  computeWindowEndFromNights,
  extractPlanWindowFromText,
} from "@/lib/plan-context/extract-plan-window";
import { isTripReviseUtterance } from "@/lib/intent-engine/is-trip-revise-utterance";

const DAY_MS = 24 * 60 * 60 * 1000;

/** 「5박6일로 갈게 / 바꿔」 — stay window revise cue (not fresh scout). */
const STAY_REVISE_CUE =
  /(?:바꿔?|바꿨|변경|수정|고쳐|늘려?|줄여?|연장|단축|업데이트)|(?:\d{1,2}\s*박(?:\s*\d{1,2}\s*일)?)\s*(?:로|으로)\s*(?:갈|가|간|잡|하|바꿨|변경|수정)|(?:갈게|갈거야|갈거|가려|가기로|간다고)/iu;

/** 「하루 늘려 / 이틀 줄여」 — relative stay revise against pack Diff. */
const RELATIVE_STAY_REVISE =
  /(?:하루|이틀|사흘|나흘)\s*(?:더\s*)?(?:늘|줄)|(?:하루|이틀)\s*더|(?:박|일정)\s*(?:늘|줄)|더\s*늘려|하루\s*늘려|하루\s*줄여|이틀\s*늘려|이틀\s*줄여|(?:이번\s*)?주말까지|(?:이번|다음)\s*주말|다음\s*주(?:로|까지|에)?/iu;

const GUEST_REVISE =
  /(?:인원|게스트|어른|성인)\s*(\d{1,2})\s*명?|(?:^|[^\d])(\d{1,2})\s*명/iu;

const KIDS_COMPANION =
  /아이랑|애랑|아이와|키즈|어린이\s*랑|유아\s*랑|아이\s*데리고/iu;

const SUITE_ROOM = /스위트|suite|패밀리\s*룸|family\s*room/iu;

export type LodgingStayReviseProposal = {
  readonly checkInIso: string;
  readonly checkOutIso: string;
  readonly guestCount: number;
  readonly roomCount: number;
  readonly nights: number;
  readonly previousNights: number | null;
  readonly previousGuestCount: number | null;
  readonly changed: Readonly<{
    nights: boolean;
    guests: boolean;
  }>;
  /** e.g. 4박5일 → 5박6일 */
  readonly summaryKo: string;
  readonly confirmHintKo: string;
};

function nightsFromSlots(slots: LodgingBookingSlots): number | null {
  if (!slots.checkInIso || !slots.checkOutIso) {
    return null;
  }
  const start = new Date(slots.checkInIso).getTime();
  const end = new Date(slots.checkOutIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }
  return Math.max(1, Math.round((end - start) / DAY_MS));
}

function formatNightsLabel(nights: number): string {
  return `${nights}박${nights + 1}일`;
}

function formatStayRangeKo(checkInIso: string, checkOutIso: string): string {
  const a = checkInIso.slice(5, 10).replace("-", "/");
  const b = checkOutIso.slice(5, 10).replace("-", "/");
  return `${a}–${b}`;
}

export function isRelativeLodgingStayReviseUtterance(text: string): boolean {
  return RELATIVE_STAY_REVISE.test(text.trim());
}

export function isLodgingStayReviseUtterance(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  if (isTripReviseUtterance(trimmed)) {
    return true;
  }
  if (isRelativeLodgingStayReviseUtterance(trimmed)) {
    return true;
  }
  if (STAY_REVISE_CUE.test(trimmed)) {
    return true;
  }
  if (KIDS_COMPANION.test(trimmed) || SUITE_ROOM.test(trimmed)) {
    return true;
  }
  return false;
}

function parseGuestCount(text: string): number | null {
  const match = text.match(GUEST_REVISE);
  if (!match) {
    return null;
  }
  const raw = match[1] ?? match[2];
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n) || n < 1 || n > 20) {
    return null;
  }
  return n;
}

/** Relative night delta — 「하루 늘려」 → +1, 「이틀 줄여」 → -2, 「다음 주」→ +7. */
export function parseRelativeNightDelta(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed || !isRelativeLodgingStayReviseUtterance(trimmed)) {
    return null;
  }
  if (/다음\s*주(?:로|까지|에)?/iu.test(trimmed) && !/주말/iu.test(trimmed)) {
    return 7;
  }
  if (/(?:이번\s*)?주말까지|(?:이번|다음)\s*주말/iu.test(trimmed)) {
    return 2;
  }
  const amountMatch = trimmed.match(/(하루|이틀|사흘|나흘)/u);
  const amount =
    amountMatch?.[1] === "이틀"
      ? 2
      : amountMatch?.[1] === "사흘"
        ? 3
        : amountMatch?.[1] === "나흘"
          ? 4
          : 1;
  const shrink = /줄|단축/iu.test(trimmed);
  const grow = /늘|연장|더/iu.test(trimmed);
  if (shrink && !grow) {
    return -amount;
  }
  if (grow || /더\s*늘/iu.test(trimmed)) {
    return amount;
  }
  // Bare 「하루」 with revise cue already matched → treat as +1 when 늘려-family
  if (/늘/iu.test(trimmed)) {
    return amount;
  }
  if (/줄/iu.test(trimmed)) {
    return -amount;
  }
  return null;
}

function baselineFromDiff(
  lodgingDiff: ContextPackLodgingDiff | null | undefined,
): {
  checkInIso: string | null;
  checkOutIso: string | null;
  nights: number | null;
  guestCount: number | null;
  roomCount: number | null;
} {
  if (!lodgingDiff) {
    return {
      checkInIso: null,
      checkOutIso: null,
      nights: null,
      guestCount: null,
      roomCount: null,
    };
  }
  return {
    checkInIso: lodgingDiff.checkInIso,
    checkOutIso: lodgingDiff.checkOutIso,
    nights: lodgingDiff.nights,
    guestCount: lodgingDiff.guestCount,
    roomCount: lodgingDiff.roomCount,
  };
}

/**
 * Parse NL stay/guest revise against lodging slots + pack Diff.
 * Does not mutate Reality — caller must confirm then writeLodgingBookingSlots.
 */
export function tryParseLodgingStayRevise(input: {
  text: string;
  event: EventCandidate | null | undefined;
  /** Previous turn Diff — forced into Context Pack every turn. */
  lodgingDiff?: ContextPackLodgingDiff | null;
}): LodgingStayReviseProposal | null {
  const text = input.text.trim();
  if (!text) {
    return null;
  }
  if (!isLodgingStayReviseUtterance(text)) {
    return null;
  }

  const slots = input.event
    ? readLodgingBookingSlots(input.event)
    : {
        checkInIso: null,
        checkOutIso: null,
        guestCount: null,
        roomCount: null,
      };
  const fromDiff = baselineFromDiff(input.lodgingDiff);
  const checkInIso = slots.checkInIso ?? fromDiff.checkInIso;
  if (!checkInIso) {
    return null;
  }

  const previousNights =
    nightsFromSlots({
      checkInIso: slots.checkInIso ?? checkInIso,
      checkOutIso: slots.checkOutIso ?? fromDiff.checkOutIso,
      guestCount: slots.guestCount,
      roomCount: slots.roomCount,
    }) ?? fromDiff.nights;
  const previousGuestCount = slots.guestCount ?? fromDiff.guestCount;

  const window = extractPlanWindowFromText(text, checkInIso);
  let nextGuests = parseGuestCount(text);
  if (nextGuests == null && KIDS_COMPANION.test(text)) {
    nextGuests = Math.min(
      20,
      (slots.guestCount ?? fromDiff.guestCount ?? 2) + 1,
    );
  }
  const relativeDelta = parseRelativeNightDelta(text);
  const hasAbsoluteNights =
    typeof window.nights === "number" && window.nights > 0;
  const hasRelativeNights =
    relativeDelta != null && previousNights != null;
  const hasNights = hasAbsoluteNights || hasRelativeNights;
  const hasGuests = nextGuests != null;
  const suiteCue = SUITE_ROOM.test(text);

  if (!hasNights && !hasGuests && !suiteCue) {
    return null;
  }

  const nextNights = hasAbsoluteNights
    ? window.nights!
    : hasRelativeNights
      ? Math.max(1, Math.min(29, previousNights! + relativeDelta!))
      : (previousNights ?? 1);

  let checkOutIso: string | null = null;
  if (hasNights) {
    checkOutIso =
      (hasAbsoluteNights ? window.windowEndIso : null) ??
      computeWindowEndFromNights(checkInIso, nextNights) ??
      null;
  } else {
    checkOutIso = slots.checkOutIso ?? fromDiff.checkOutIso ?? null;
  }
  if (!checkOutIso) {
    return null;
  }

  const guestCount =
    nextGuests ?? previousGuestCount ?? slots.guestCount ?? 2;
  const roomCount = Math.max(
    1,
    suiteCue
      ? Math.max(slots.roomCount ?? fromDiff.roomCount ?? 1, 1)
      : (slots.roomCount ?? fromDiff.roomCount ?? 1),
  );
  const nightsChanged =
    previousNights == null || previousNights !== nextNights;
  const guestsChanged =
    nextGuests != null && nextGuests !== (previousGuestCount ?? null);

  if (!nightsChanged && !guestsChanged && !suiteCue) {
    return null;
  }

  const parts: string[] = [];
  if (nightsChanged) {
    const from =
      previousNights != null ? formatNightsLabel(previousNights) : "일정";
    parts.push(`${from} → ${formatNightsLabel(nextNights)}`);
  }
  if (guestsChanged) {
    const from =
      previousGuestCount != null
        ? `게스트 ${previousGuestCount}`
        : "인원";
    parts.push(`${from} → 게스트 ${guestCount}`);
  }
  if (suiteCue) {
    parts.push("스위트·패밀리 룸");
  }
  const summaryKo = parts.join(" · ") || "숙소 조건";
  const rangeKo = formatStayRangeKo(checkInIso, checkOutIso);

  return {
    checkInIso,
    checkOutIso,
    guestCount,
    roomCount,
    nights: nextNights,
    previousNights,
    previousGuestCount,
    changed: { nights: nightsChanged, guests: guestsChanged || suiteCue },
    summaryKo,
    confirmHintKo: `${summaryKo} (${rangeKo})로 바꿀까요?`,
  };
}
