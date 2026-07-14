import type { ResearchPlanStep } from "@/engines/research/schema";

/** Stage 3 — fixed research plan template (sources × axes). */
export function buildResearchPlan(queries: readonly string[]): ResearchPlanStep[] {
  const primary = queries[0] ?? "요청";
  return [
    {
      id: "scan_listings",
      labelKo: "목록·지도 스니펫 스캔",
      queries: queries.slice(0, 4),
    },
    {
      id: "scan_reviews",
      labelKo: "후기·평판 축 스캔",
      queries: [`${primary} 후기`, `${primary} 평점`].filter(Boolean),
    },
    {
      id: "scan_price",
      labelKo: "가격·가성비 축 스캔",
      queries: [`${primary} 가격`, `${primary} 가성비`].filter(Boolean),
    },
    {
      id: "cross_check",
      labelKo: "독립 출처 교차 확인",
      queries: queries.slice(0, 3),
    },
  ];
}
