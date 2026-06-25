import type { ExternalQueryIntent } from "@/lib/external-context-ask/external-context-opportunity-types";

export function formatExternalEmptyReply(intent: ExternalQueryIntent): string {
  switch (intent) {
    case "trade":
      return "아직 근처에 맞는 맞춤이 없어요 · @중고에서 내놓으면 바로 연결돼요";
    case "travel":
      return "아직 이 근처에 여행 맥락이 없어요 · 흔적을 공개하면 함께 갈 사람이 찾을 수 있어요";
    case "study":
      return "아직 근처 스터디 맥락이 없어요 · 모임 흔적을 남기면 다음에 연결돼요";
    case "gathering":
      return "아직 참여할 모임 맥락이 없어요 · 주말에 다시 물어보면 새 흔적이 보일 수 있어요";
    default:
      return "아직 이 근처 공개 맥락이 없어요 · 밖 지구에 흔적이 쌓이면 기회를 연결해 드릴게요";
  }
}
