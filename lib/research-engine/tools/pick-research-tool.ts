import type { ResearchToolGap, ResearchToolId } from "@/lib/research-engine/tools/types";
import type { ResearchStrategyId } from "@/lib/research-engine/research-strategy";
import { reorderGapsForStrategy } from "@/lib/research-engine/research-strategy";

/**
 * Map persuasion gaps → one named surgical tool (strategy reorders gap priority).
 *
 * Cursor-like: observation → places_details · priceFit → rate_lookup ·
 * distance → distance_check · crossCheck → yt_preview
 */
export function pickResearchTool(input: {
  gaps: readonly ResearchToolGap[];
  tried: ReadonlySet<ResearchToolId>;
  hasCoords: boolean;
  hasAnchor: boolean;
  strategy?: ResearchStrategyId;
}): ResearchToolId | null {
  const gaps = input.strategy
    ? reorderGapsForStrategy(input.gaps, input.strategy)
    : input.gaps;
  for (const gap of gaps) {
    let tool: ResearchToolId | null = null;
    switch (gap.axisId) {
      case "observation":
        tool = "places_details";
        break;
      case "priceFit":
        tool = "rate_lookup";
        break;
      case "distance":
        tool =
          input.hasCoords && input.hasAnchor
            ? "distance_check"
            : "places_details";
        break;
      case "crossCheck":
        tool = "yt_preview";
        break;
      case "context":
        tool = "places_details";
        break;
      default:
        tool = null;
    }
    if (tool && !input.tried.has(tool)) {
      return tool;
    }
  }
  return null;
}
