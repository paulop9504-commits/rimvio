/**
 * Named Research tools — Cursor-like instruments (id = pick key).
 *
 * Gap → pickResearchTool(id) → tool.run → patch → rescore.
 */

import type { ResearchTool, ResearchToolId } from "@/lib/research-engine/tools/types";
import { placesDetailsTool } from "@/lib/research-engine/tools/places-details-tool";
import { rateLookupTool } from "@/lib/research-engine/tools/rate-lookup-tool";
import { distanceCheckTool } from "@/lib/research-engine/tools/distance-check-tool";
import { ytPreviewTool } from "@/lib/research-engine/tools/yt-preview-tool";

export type ResearchToolRegistryEntry = {
  readonly id: ResearchToolId;
  /** Wire id — shown in toolTrace like Cursor tool names. */
  readonly name: ResearchToolId;
  readonly labelKo: string;
  /** When to call (gap axis → human). */
  readonly fillsGapKo: string;
  /** Live SSOT this tool hits. */
  readonly ssotKo: string;
  readonly tool: ResearchTool;
};

/**
 * Registry SSOT — pick by id only; never anonymous pipeline steps.
 */
export const RESEARCH_TOOL_REGISTRY: readonly ResearchToolRegistryEntry[] = [
  {
    id: "places_details",
    name: "places_details",
    labelKo: "장소 상세",
    fillsGapKo: "리뷰·별점·좌표 관측이 약할 때",
    ssotKo: "Google Places inventory (keyword / place search)",
    tool: placesDetailsTool,
  },
  {
    id: "rate_lookup",
    name: "rate_lookup",
    labelKo: "요금 조회",
    fillsGapKo: "가격 신호가 없을 때",
    ssotKo: "LiteAPI lodging rates (no keyword → live price)",
    tool: rateLookupTool,
  },
  {
    id: "distance_check",
    name: "distance_check",
    labelKo: "동선 확인",
    fillsGapKo: "앵커 대비 거리가 미확정일 때",
    ssotKo: "Haversine(candidate ↔ anchor)",
    tool: distanceCheckTool,
  },
  {
    id: "yt_preview",
    name: "yt_preview",
    labelKo: "영상 근거",
    fillsGapKo: "교차 근거(영상)가 약할 때",
    ssotKo: "YouTube lodging preview gate",
    tool: ytPreviewTool,
  },
] as const;

export function getResearchTool(id: ResearchToolId): ResearchTool | null {
  return RESEARCH_TOOL_REGISTRY.find((e) => e.id === id)?.tool ?? null;
}

export function listResearchToolIds(): readonly ResearchToolId[] {
  return RESEARCH_TOOL_REGISTRY.map((e) => e.id);
}

export function formatResearchToolCallLine(call: {
  toolId: string;
  status: string;
  summaryKo: string;
}): string {
  const mark =
    call.status === "ok" ? "✓" : call.status === "skip" ? "–" : "!";
  return `${call.toolId} ${mark} ${call.summaryKo}`;
}
