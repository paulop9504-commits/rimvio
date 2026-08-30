/**
 * Role-aware NL → Resource op. Same parser for UI composer and Agent.
 */

import type { ExperienceAppRole } from "@/lib/experience-app/types";
import type { ExperienceResourceOp } from "@/lib/hub/dev/experience-os/types";

export type ExperienceAppIntent = {
  readonly op: ExperienceResourceOp;
  readonly args: Record<string, unknown>;
  readonly roleHint?: ExperienceAppRole;
};

export function parseExperienceAppUtterance(utterance: string): ExperienceAppIntent | null {
  const t = utterance.trim();
  if (!t) return null;

  if (/오늘\s*주문|주문\s*몇|매출|조리중|배달중/.test(t)) {
    return { op: "order.stats", args: {}, roleHint: "merchant" };
  }
  if (/방금\s*들어온\s*주문.*취소|주문\s*#?\d+.*취소/.test(t) && !/내\s*주문/.test(t)) {
    return { op: "order.cancel", args: { latest: true }, roleHint: "merchant" };
  }
  if (/내\s*주문.*취소|주문\s*취소해/.test(t)) {
    return { op: "order.cancel", args: { latest: true, mine: true }, roleHint: "consumer" };
  }
  if (/어디까지|어디\s*왔|지금\s*주문|주문\s*상태|배달\s*상태/.test(t)) {
    return { op: "order.status", args: { latest: true, mine: true }, roleHint: "consumer" };
  }
  if (/내\s*주문|주문\s*어디|배달\s*어디|추적/.test(t)) {
    return { op: "order.list", args: { mine: true }, roleHint: "consumer" };
  }
  if (/주문\s*목록|들어온\s*주문|주문\s*관리/.test(t)) {
    return { op: "order.list", args: {}, roleHint: "merchant" };
  }
  if (/치킨|배달\s*시켜|주문해|맛있는\s*곳|근처.*찾/.test(t) && !/플랫폼|만들어/.test(t)) {
    return { op: "order.searchStores", args: { query: t }, roleHint: "consumer" };
  }
  return null;
}

export function wantsExperienceAppUse(utterance: string): boolean {
  const parsed = parseExperienceAppUtterance(utterance);
  return parsed !== null && !/플랫폼|만들어줘/.test(utterance);
}
