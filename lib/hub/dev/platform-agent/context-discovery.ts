/**
 * Platform Context Discovery (P1/P2).
 * User Goal → relevant Platform objects → relevant source paths.
 * Progressive: metadata → capability → workflow → schema → dependency → files.
 */

import type { PlatformDraft } from "@/lib/hub/platform/types";
import type { PlatformGoal } from "@/lib/hub/dev/platform-agent/platform-goal";
import {
  buildPlatformSourceMap,
  findRelatedSourceRefs,
  sourcePathsForCapability,
  type PlatformSourceRef,
} from "@/lib/hub/dev/platform-agent/platform-source-map";
import { parseWorkflowGraph } from "@/lib/hub/dev/workflow-graph";
import {
  selectRelevantContext,
  type ScoredContextRef,
} from "@/lib/hub/dev/platform-agent/relevant-context";

export type DiscoveredPlatformContext = {
  readonly goal: PlatformGoal;
  readonly existingCapabilities: readonly string[];
  readonly missingCapabilities: readonly string[];
  readonly relatedCapabilities: readonly string[];
  readonly workflowSteps: readonly string[];
  readonly sourceRefs: readonly PlatformSourceRef[];
  readonly relevantContext: readonly ScoredContextRef[];
  readonly sourcePaths: readonly string[];
  readonly reuseCandidates: readonly string[];
  readonly lines: readonly string[];
};

const DEPENDENCY_EDGES: Readonly<Record<string, readonly string[]>> = {
  "booking.cancel": ["payment.refund", "payment.commit", "payment.prepare", "booking.confirm"],
  "booking.confirm": ["booking.prepare", "payment.prepare"],
  "payment.commit": ["payment.prepare"],
  "hotel.search": ["hotel.detail"],
  "booking.prepare": ["room.availability", "hotel.detail"],
};

function expandDependencies(seeds: readonly string[]): string[] {
  const seen = new Set<string>();
  const queue = [...seeds];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const dep of DEPENDENCY_EDGES[id] ?? []) {
      if (!seen.has(dep)) queue.push(dep);
    }
  }
  return [...seen];
}

function keywordsFromGoal(goal: PlatformGoal, utterance: string): string[] {
  const base = [
    ...goal.requestedCapabilities,
    ...goal.flows.flatMap((f) => f.split(/\s*→\s*|\s*->\s*/)),
    utterance,
  ];
  if (goal.scope.kind === "code_direct") {
    if (goal.scope.targetCapability) base.push(goal.scope.targetCapability);
    if (goal.scope.targetPath) base.push(goal.scope.targetPath);
    if (goal.scope.targetSymbol) base.push(goal.scope.targetSymbol);
  }
  return base.filter(Boolean);
}

/** Discover platform context for a goal without reading all files. */
export function discoverPlatformContext(input: {
  readonly goal: PlatformGoal;
  readonly utterance: string;
  readonly draft: PlatformDraft;
}): DiscoveredPlatformContext {
  const existing = input.draft.actions.map((a) => a.name);
  const requested = [...input.goal.requestedCapabilities];
  const related = expandDependencies(requested.length ? requested : keywordsFromGoal(input.goal, input.utterance)
    .filter((k) => k.includes(".")));

  const missing = requested.filter((c) => !existing.includes(c));
  const reuseCandidates = requested.filter((c) => existing.includes(c));

  const graph = parseWorkflowGraph(input.draft);
  const workflowSteps = graph.nodes
    .filter((n) => n.kind === "capability")
    .map((n) => n.capabilityId ?? n.label);

  const keywords = keywordsFromGoal(input.goal, input.utterance);
  const relevant = selectRelevantContext({
    goal: input.goal,
    utterance: input.utterance,
    draft: input.draft,
  });
  let sourceRefs = findRelatedSourceRefs({ draft: input.draft, keywords });

  if (sourceRefs.length === 0 && related.length > 0) {
    sourceRefs = related.flatMap((cap) =>
      buildPlatformSourceMap(input.draft).filter((r) => r.id === cap || r.id.startsWith(cap)),
    );
  }

  if (input.goal.scope.kind === "code_direct" && input.goal.scope.targetCapability) {
    const paths = sourcePathsForCapability(input.draft, input.goal.scope.targetCapability);
    sourceRefs = [
      ...sourceRefs,
      {
        kind: "capability" as const,
        id: input.goal.scope.targetCapability,
        label: input.goal.scope.targetCapability,
        paths,
      },
    ];
  }

  if (relevant.selected.length > 0) {
    sourceRefs = [
      ...sourceRefs,
      ...relevant.selected.filter((r) => !sourceRefs.some((s) => s.id === r.id)),
    ];
  }

  const sourcePaths = [...new Set(sourceRefs.flatMap((r) => r.paths))];

  const lines = [
    `Goal: ${input.goal.summaryKo}`,
    `Existing capabilities: ${existing.length}`,
    related.length ? `Related: ${related.join(", ")}` : "Related: (discovering)",
    missing.length ? `Missing: ${missing.join(", ")}` : "Missing: none",
    reuseCandidates.length ? `Reuse: ${reuseCandidates.join(", ")}` : "",
    relevant.selected.length
      ? `Relevant context: ${relevant.selected.slice(0, 3).map((r) => `${r.id}(${r.score})`).join(", ")}`
      : "",
    sourcePaths.length ? `Source paths: ${sourcePaths.slice(0, 4).join(", ")}` : "",
  ].filter(Boolean);

  return {
    goal: input.goal,
    existingCapabilities: existing,
    missingCapabilities: missing,
    relatedCapabilities: related,
    workflowSteps,
    sourceRefs,
    relevantContext: relevant.selected,
    sourcePaths,
    reuseCandidates,
    lines,
  };
}
