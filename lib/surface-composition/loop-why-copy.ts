import { deriveLoopContextKo as deriveLoopContextKoSsot } from "@/lib/guardian-copy/jarvis-copy-ssot";
import type { LoopType } from "@/lib/loop-wiring/loop-contract";

/** @deprecated import from `@/lib/guardian-copy` — partner tone default for legacy callers. */
const LOOP_CONTEXT_KO: Record<LoopType, string> = {
  MORNING_LOOP: "아침 흐름 — 오늘 일정을 먼저 맞추고 있어요",
  TRANSIT_LOOP: "이동 중 — 길찾기·출근에 맞춰 제안해요",
  INTERRUPTION_LOOP: "방금 끼어든 일 — 알림·연락을 우선해요",
  EVENING_LOOP: "저녁 흐름 — 약속·휴식 쪽을 먼저 볼게요",
};

export function deriveLoopContextKo(loopType: LoopType | null | undefined): string | null {
  if (!loopType) {
    return null;
  }
  return deriveLoopContextKoSsot(loopType, "partner") ?? LOOP_CONTEXT_KO[loopType] ?? null;
}

export { deriveLoopContextKo as deriveLoopContextKoForTone } from "@/lib/guardian-copy/jarvis-copy-ssot";
