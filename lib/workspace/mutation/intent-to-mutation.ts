/**
 * Intent → Workspace Engine Mutation (Draft Environment apply step).
 */

import type { WorkspaceIntent } from "@/lib/workspace-command/types";
import type { WorkspaceEngineMutation } from "@/lib/workspace/mutation/types";

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** Normalize extended intents onto engine mutation types */
export function intentToEngineMutation(
  intent: WorkspaceIntent,
  options?: { readonly objectId?: string | null },
): WorkspaceEngineMutation | null {
  const target = intent.target || "workspace";
  const p = intent.parameters;
  const objectId = options?.objectId?.trim() || undefined;

  const action =
    intent.action === "modify_context"
      ? "filter"
      : intent.action === "optimize_context"
        ? "move"
        : intent.action === "analyze_context"
          ? "simulate"
          : intent.action === "create_draft"
            ? "prepare"
            : intent.action;

  switch (action) {
    case "filter": {
      if (p.historyOp) return null;
      const hotelType = str(p.hotelType) ?? str(p.category);
      const filter = (p.filter ?? null) as Record<string, unknown> | null;
      const changes: Record<string, unknown> = {};
      if (hotelType) changes.category = hotelType;
      if (filter?.maxPriceBand != null) {
        changes.maxPriceBand = filter.maxPriceBand;
      } else if (typeof p.maxPriceBand === "number") {
        changes.maxPriceBand = p.maxPriceBand;
      }
      if (filter?.tagIncludes && Array.isArray(filter.tagIncludes)) {
        const tags = filter.tagIncludes as string[];
        if (tags.some((t) => /capsule|stay:capsule/i.test(t))) {
          changes.category = "capsule";
        }
      }
      if (Object.keys(changes).length === 0 && filter) {
        Object.assign(changes, filter);
      }
      if (Object.keys(changes).length === 0) {
        changes.raw = true;
      }
      return {
        type: "FILTER_OBJECT",
        target: target === "workspace" ? "hotel" : target,
        changes,
      };
    }
    case "add_constraint": {
      const near = str(p.near) ?? str(p.station) ?? str(p.utterance);
      return {
        type: "ADD_CONSTRAINT",
        target,
        objectId,
        changes: { near, pin: p.pin, ...p },
      };
    }
    case "remove_constraint":
      return {
        type: "REMOVE_CONSTRAINT",
        target,
        changes: { clear: p.clear ?? true, key: p.key ?? null },
      };
    case "replace":
      return {
        type: "REPLACE_OBJECT",
        target,
        objectId,
        changes: {
          findSimilar: Boolean(p.findSimilar),
          remove: Boolean(p.remove),
          utterance: p.utterance ?? null,
        },
      };
    case "move":
      return {
        type: "MOVE_OBJECT",
        target,
        objectId,
        changes: {
          dayHint: str(p.dayHint) ?? str(p.utterance),
          optimizeRoute: Boolean(p.optimizeRoute),
        },
      };
    case "compare":
      return { type: "COMPARE_OBJECT", target, objectId, changes: {} };
    case "simulate":
      return {
        type: "SIMULATE",
        target,
        objectId,
        changes: {
          scenarioKo:
            str(p.simulateScenarioKo) ?? str(p.utterance) ?? "what-if",
        },
      };
    case "prepare":
      return {
        type: "PREPARE",
        target,
        objectId,
        changes: { labelKo: str(p.labelKo) ?? "예약 준비" },
      };
    default:
      return null;
  }
}
