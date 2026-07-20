/**
 * Osaka 30s demo — step script (L1 labels only).
 * Trip → APA pin → nearby food → local filter → first reserve → 한 탭 승인.
 */

export const OSAKA_30S_DEMO_VERSION = 1 as const;

export const OSAKA_30S_DEMO_STEPS = [
  {
    id: "trip",
    utterance: "오사카 여행 만들어",
    labelKo: "오사카 여행",
    hintKo: "여행 맥락을 만들어요",
  },
  {
    id: "pin_apa",
    utterance: "APA호텔 고정",
    labelKo: "APA 고정",
    hintKo: "난바·우메다를 지도에 올려요",
  },
  {
    id: "nearby_food",
    utterance: "주변 맛집 찾아줘",
    labelKo: "주변 맛집",
    hintKo: "근처 식당을 펼쳐요",
  },
  {
    id: "local_filter",
    utterance: "현지인",
    labelKo: "현지인",
    hintKo: "현지 맛만 남겨요",
  },
  {
    id: "first_reserve",
    utterance: "첫 번째 예약",
    labelKo: "첫 예약",
    hintKo: "결재함에 담아요",
  },
  {
    id: "approve",
    utterance: "승인",
    labelKo: "승인",
    hintKo: "한 탭으로 반영해요",
  },
] as const;

export type Osaka30sDemoStepId = (typeof OSAKA_30S_DEMO_STEPS)[number]["id"];

export type Osaka30sDemoStepStatus =
  | "pending"
  | "running"
  | "done"
  | "awaiting_approve"
  | "error";

export type Osaka30sDemoProgress = {
  readonly version: typeof OSAKA_30S_DEMO_VERSION;
  readonly contextEventId: string | null;
  readonly stepId: Osaka30sDemoStepId | null;
  readonly stepIndex: number;
  readonly status: Osaka30sDemoStepStatus;
  readonly replyKo: string | null;
  readonly done: boolean;
  /** Scene 6 — waiting for human one-tap Commit. */
  readonly awaitingHuman: boolean;
  readonly canRewind: boolean;
  readonly errorKo: string | null;
};
