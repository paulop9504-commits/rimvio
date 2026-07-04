import type { GhostAxisId, SituationType } from "@/lib/situation-projection/types";

export type GhostAxisPlaybookEntry = {
  axisId: GhostAxisId;
  labelKo: string;
  featureId?: string | null;
  reasonKo: string;
};

/** Deterministic catalog — not LLM-generated. */
export const SITUATION_GHOST_PLAYBOOKS: Record<
  SituationType,
  readonly GhostAxisPlaybookEntry[]
> = {
  caregiving: [
    {
      axisId: "schedule",
      labelKo: "일정",
      reasonKo: "검진·방문 일정",
    },
    {
      axisId: "place",
      labelKo: "병원·약국",
      reasonKo: "치료 장소",
    },
    {
      axisId: "people",
      labelKo: "가족",
      reasonKo: "함께하는 사람",
    },
    {
      axisId: "records",
      labelKo: "기록",
      reasonKo: "투약·메모",
    },
    {
      axisId: "insurance",
      labelKo: "보험·서류",
      reasonKo: "청구·서류 축",
    },
    {
      axisId: "cost",
      labelKo: "비용",
      reasonKo: "의료비·정산",
    },
  ],
  travel: [
    { axisId: "flight", labelKo: "항공", reasonKo: "출발 허브" },
    { axisId: "lodging", labelKo: "숙소", reasonKo: "머무는 축" },
    { axisId: "eatery", labelKo: "맛집", reasonKo: "식사 동선" },
    { axisId: "info", labelKo: "정보", reasonKo: "현지 정보" },
  ],
  trade: [
    { axisId: "place", labelKo: "만남 장소", reasonKo: "거래 장소" },
    { axisId: "people", labelKo: "상대", reasonKo: "거래 상대" },
    { axisId: "cost", labelKo: "금액", reasonKo: "실거래가" },
    { axisId: "thread", labelKo: "대화", reasonKo: "거래 DM" },
  ],
  collab: [
    { axisId: "people", labelKo: "함께한 사람", reasonKo: "bridge 참여" },
    { axisId: "thread", labelKo: "대화", reasonKo: "bridge thread" },
    { axisId: "media", labelKo: "순간", reasonKo: "공유 미디어" },
    { axisId: "place", labelKo: "장소", reasonKo: "함께한 곳" },
  ],
  generic: [
    { axisId: "schedule", labelKo: "일정", reasonKo: "시간 맥락" },
    { axisId: "place", labelKo: "장소", reasonKo: "공간 맥락" },
    { axisId: "people", labelKo: "사람", reasonKo: "관계 맥락" },
    { axisId: "capture", labelKo: "기록", reasonKo: "남긴 흔적" },
  ],
};

export function ghostPlaybookForSituation(
  situationType: SituationType,
): readonly GhostAxisPlaybookEntry[] {
  return SITUATION_GHOST_PLAYBOOKS[situationType] ?? SITUATION_GHOST_PLAYBOOKS.generic;
}
