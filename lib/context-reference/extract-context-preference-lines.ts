/**
 * Thin preference lines from a source Context (ADR-030) — display / bias only.
 */

import type { EventCandidate } from "@/lib/events/event-candidate";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

export function extractContextPreferenceLines(
  event: EventCandidate,
): readonly string[] {
  const lines: string[] = [];
  const plan = readPlanContextFromEvent(event);
  const place = plan?.place?.trim() || event.place?.trim();
  if (place) {
    lines.push(`장소 기준 · ${place}`);
  }
  if (plan?.nights != null && plan.nights > 0) {
    lines.push(`체류 · ${plan.nights}박`);
  }
  if (plan?.planMode === "group") {
    lines.push("동행 · 그룹");
  } else if (plan?.planMode === "solo") {
    lines.push("동행 · 혼자");
  }
  const meta = event.metadata ?? {};
  const budget =
    typeof meta.budgetLabelKo === "string" ? meta.budgetLabelKo.trim() : "";
  if (budget) {
    lines.push(`예산 · ${budget}`);
  }
  if (lines.length === 0) {
    lines.push(`${event.title.trim() || "이전 맥락"} 스타일 참고`);
  }
  return lines.slice(0, 4);
}
