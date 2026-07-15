import type { RankedCandidate } from "@/engines/research/schema";
import {
  scoreResearchPersuasion,
  type PersuasionContext,
} from "@/lib/research-engine/score-persuasion";
import type { ResearchStrategyId } from "@/lib/research-engine/research-strategy";
import { reorderRankedForStrategy } from "@/lib/research-engine/research-strategy";
import { applyResearchToolPatch } from "@/lib/research-engine/tools/apply-tool-patch";
import {
  closedMissingFields,
  detectResearchMissingFields,
  fieldGapsToAxisGaps,
  type ResearchMissingField,
} from "@/lib/research-engine/tools/detect-research-missing-fields";
import { pickResearchToolForMissing } from "@/lib/research-engine/tools/pick-tool-for-missing";
import { RESEARCH_TOOL_REGISTRY } from "@/lib/research-engine/tools/research-tool-registry";
import type {
  ResearchTool,
  ResearchToolCall,
  ResearchToolId,
  ResearchToolRuntime,
} from "@/lib/research-engine/tools/types";

/** Named instrument set — same ids Cursor would list. */
export const DEFAULT_RESEARCH_TOOLS: readonly ResearchTool[] =
  RESEARCH_TOOL_REGISTRY.map((e) => e.tool);

function readMetaNumber(
  metadata: RankedCandidate["candidate"]["metadata"],
  key: string,
): number | null {
  const v = metadata?.[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export type ResearchGapRetryStep = {
  readonly missing: ResearchMissingField;
  readonly missingKey: `missing:${ResearchMissingField}`;
  readonly toolId: ResearchToolId;
  readonly status: "ok" | "skip" | "error";
  readonly closedFields: readonly ResearchMissingField[];
  readonly remainingAfter: readonly ResearchMissingField[];
  readonly persuasionBefore: number;
  readonly persuasionAfter: number;
  readonly summaryKo: string;
};

export type RunResearchSurgicalLoopResult = {
  readonly ranked: readonly RankedCandidate[];
  readonly toolTrace: readonly ResearchToolCall[];
  readonly gapRetryTrace: readonly ResearchGapRetryStep[];
  readonly strategy: ResearchStrategyId;
};

/**
 * Cursor-like gap loop:
 * missing:reviewCount → places_details → axis rescore → next missing → …
 */
export async function runResearchSurgicalLoop(input: {
  ranked: readonly RankedCandidate[];
  persuasionContext: PersuasionContext;
  maxRounds?: number;
  tools?: readonly ResearchTool[];
  runtime?: ResearchToolRuntime;
  onTool?: (call: ResearchToolCall) => void;
  onGapRetry?: (step: ResearchGapRetryStep) => void;
  strategy?: ResearchStrategyId;
  /** Clear tried set when switching lenses. */
  resetTried?: boolean;
  priorTried?: ReadonlySet<ResearchToolId>;
}): Promise<RunResearchSurgicalLoopResult> {
  const strategy = input.strategy ?? "balanced";
  const tools = input.tools ?? DEFAULT_RESEARCH_TOOLS;
  const byId = new Map(tools.map((t) => [t.id, t]));
  const triedTools = new Set<ResearchToolId>(
    input.resetTried ? [] : [...(input.priorTried ?? [])],
  );
  const triedFields = new Set<ResearchMissingField>();
  const toolTrace: ResearchToolCall[] = [];
  const gapRetryTrace: ResearchGapRetryStep[] = [];
  let ranked = reorderRankedForStrategy({
    ranked: input.ranked,
    strategy,
    maxNightlyPriceKrw: input.persuasionContext.maxNightlyPriceKrw,
    anchorLat: input.persuasionContext.anchorLat,
    anchorLng: input.persuasionContext.anchorLng,
  });
  const maxRounds = Math.max(1, Math.min(8, input.maxRounds ?? 5));

  for (let round = 0; round < maxRounds; round += 1) {
    const missingBefore = detectResearchMissingFields({
      ranked,
      persuasionContext: input.persuasionContext,
    });
    if (missingBefore.length === 0) {
      break;
    }

    const best = ranked.find((r) => !r.rejected)?.candidate;
    if (!best) {
      break;
    }
    const hasCoords =
      readMetaNumber(best.metadata, "lat") != null &&
      readMetaNumber(best.metadata, "lng") != null;
    const hasAnchor =
      input.persuasionContext.anchorLat != null &&
      input.persuasionContext.anchorLng != null;

    const picked = pickResearchToolForMissing({
      missing: missingBefore,
      triedTools,
      triedFields,
      hasCoords,
      hasAnchor,
      strategy,
    });
    if (!picked) {
      break;
    }

    triedTools.add(picked.toolId);
    triedFields.add(picked.field);
    const tool = byId.get(picked.toolId);
    if (!tool) {
      continue;
    }

    const persuasionBefore = scoreResearchPersuasion(
      ranked,
      input.persuasionContext,
    ).score;

    const axisGaps = fieldGapsToAxisGaps(missingBefore);
    const call = await tool.run({
      candidate: best,
      ranked,
      gaps: axisGaps,
      context: {
        persuasion: input.persuasionContext,
        runtime: input.runtime,
      },
    });
    toolTrace.push(call);
    input.onTool?.(call);

    if (call.status === "ok" && call.patch) {
      ranked = applyResearchToolPatch({
        ranked,
        candidateId: call.candidateId,
        patch: call.patch,
      });
      ranked = reorderRankedForStrategy({
        ranked,
        strategy,
        maxNightlyPriceKrw: input.persuasionContext.maxNightlyPriceKrw,
        anchorLat: input.persuasionContext.anchorLat,
        anchorLng: input.persuasionContext.anchorLng,
      });
    }

    const missingAfter = detectResearchMissingFields({
      ranked,
      persuasionContext: input.persuasionContext,
    });
    const persuasionAfter = scoreResearchPersuasion(
      ranked,
      input.persuasionContext,
    ).score;
    const closed = closedMissingFields(missingBefore, missingAfter);

    const delta =
      Math.round((persuasionAfter - persuasionBefore) * 1000) / 1000;
    const deltaLabel =
      delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2);
    const step: ResearchGapRetryStep = {
      missing: picked.field,
      missingKey: picked.missingKey,
      toolId: picked.toolId,
      status: call.status,
      closedFields: closed,
      remainingAfter: missingAfter.map((m) => m.field),
      persuasionBefore,
      persuasionAfter,
      summaryKo:
        call.status === "ok"
          ? `${picked.missingKey} → ${picked.toolId} ✓ 축 ${persuasionBefore.toFixed(2)}→${persuasionAfter.toFixed(2)} (${deltaLabel}) · 닫힘 ${closed.join(",") || "—"}`
          : `${picked.missingKey} → ${picked.toolId} ${call.status === "skip" ? "–" : "!"} 축 유지 ${persuasionAfter.toFixed(2)} · ${call.summaryKo}`,
    };
    gapRetryTrace.push(step);
    input.onGapRetry?.(step);
  }

  return { ranked, toolTrace, gapRetryTrace, strategy };
}
