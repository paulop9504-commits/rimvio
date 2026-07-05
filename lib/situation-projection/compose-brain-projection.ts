import type { EventCandidate } from "@/lib/events/event-candidate";
import type { MediaGuideNode } from "@/lib/ontology/media-guide-types";
import { recordBrainQuestionFamilyAnswer } from "@/lib/situation-projection/brain-question-memory";
import { resolveBrainQuestionRoute } from "@/lib/situation-projection/brain-question-router";
import { buildGoogleMapsSearchHref } from "@/lib/resolvers/deep-links";
import {
  applyLlmMindMapLayout,
  type LlmMindMapLayoutWire,
} from "@/lib/situation-projection/apply-llm-mind-map-layout";
import { computeMindMapLayout } from "@/lib/situation-projection/compute-mind-map-layout";
import { buildHubRunnablePills } from "@/lib/situation-projection/build-hub-runnable-pills";
import type { PersonaLearnChoice } from "@/lib/persona/types";
import {
  composeSituationProjectionManifest,
  type ComposeProjectionManifestInput,
} from "@/lib/situation-projection/compose-projection-manifest";
import { resolveProjectionNodeSemantic } from "@/lib/situation-projection/ontology-semantic";
import {
  annotateCaregivingKnowledgeGhost,
  promoteProjectionAfterUserCommit,
} from "@/lib/situation-projection/promote-projection-link";
import {
  readProjectionManifestForAnchor,
  writeProjectionManifest,
} from "@/lib/situation-projection/projection-store";
import { requestLlmMindMapLayout } from "@/lib/situation-projection/request-llm-mind-map-layout";
import {
  applyTravelBrainAnswer,
  buildTravelBrainProjection,
  type TravelBrainQuestion,
} from "@/lib/situation-projection/travel-brain-personalization";
import { travelBrainPolicy } from "@/lib/situation-projection/travel-brain-policy";
import type {
  GhostProjectionNode,
  ProjectionLink,
  SituationProjectionManifest,
} from "@/lib/situation-projection/types";

export type ComposeBrainProjectionInput = ComposeProjectionManifestInput & {
  llmLayout?: LlmMindMapLayoutWire | null;
  persist?: boolean;
  /** When true (default), attempt async LLM layout after deterministic compose. */
  requestLlmLayout?: boolean;
};

/**
 * Brain button ingress — mind_map surface + Hub pills.
 * @see docs/RIMVIO_SITUATION_PROJECTION_LAYER.md
 */
export function composeBrainProjectionManifest(
  input: ComposeBrainProjectionInput,
): SituationProjectionManifest {
  const base = composeSituationProjectionManifest({
    ...input,
    surfaceKind: "mind_map",
    trigger: {
      ...input.trigger,
      source: input.trigger.source === "manual" ? "manual" : input.trigger.source,
    },
  });

  const ghosts = annotateCaregivingKnowledgeGhost(base.nodes.filter(
    (n): n is import("@/lib/situation-projection/types").GhostProjectionNode =>
      n.kind === "ghost",
  ), base.situationType);

  const pills = buildHubRunnablePills({
    event: input.event,
    situationType: base.situationType,
    ghosts,
  });

  const links = base.links.map((link) => ({
    ...link,
    strokeStyle: link.virtual ? ("dashed" as const) : ("solid" as const),
    weight: link.virtual ? 28 : 62,
  }));

  let manifest: SituationProjectionManifest = {
    ...base,
    nodes: [
      ...base.nodes.filter((n) => n.kind === "solid"),
      ...ghosts,
    ],
    links,
    pills,
    layoutSource: "deterministic",
  };
  manifest = {
    ...manifest,
    mindMapLayout: computeMindMapLayout(manifest),
  };

  manifest = applyLlmMindMapLayout(manifest, input.llmLayout ?? null);

  if (input.persist !== false) {
    writeProjectionManifest(manifest);
  }

  return manifest;
}

/**
 * Async brain compose — deterministic manifest first, then Phase 3 LLM layout when gated.
 */
export async function composeBrainProjectionManifestAsync(
  input: Omit<ComposeBrainProjectionInput, "llmLayout"> & {
    llmLayout?: LlmMindMapLayoutWire | null;
  },
): Promise<SituationProjectionManifest> {
  const deterministic = composeBrainProjectionManifest({
    ...input,
    llmLayout: null,
    persist: false,
    requestLlmLayout: false,
  });

  const llmLayout =
    input.llmLayout !== undefined
      ? input.llmLayout
      : input.requestLlmLayout === false
        ? null
        : await requestLlmMindMapLayout(deterministic);

  const manifest = applyLlmMindMapLayout(deterministic, llmLayout);

  if (input.persist !== false) {
    writeProjectionManifest(manifest);
  }

  return manifest;
}

export function openBrainProjectionForEvent(
  event: EventCandidate,
  options?: { llmLayout?: ComposeBrainProjectionInput["llmLayout"] },
): SituationProjectionManifest {
  return composeBrainProjectionManifest({
    event,
    trigger: { source: "manual", atIso: new Date().toISOString() },
    llmLayout: options?.llmLayout,
  });
}

export function readBrainProjectionForEvent(
  eventId: string,
): SituationProjectionManifest | null {
  return readProjectionManifestForAnchor(eventId);
}

export function commitKnowledgeToProjection(input: {
  anchorEventId: string;
  ghostNodeId: string;
  pillId?: string | null;
}): SituationProjectionManifest | null {
  const current = readProjectionManifestForAnchor(input.anchorEventId);
  if (!current) {
    return null;
  }
  const next = promoteProjectionAfterUserCommit({
    manifest: current,
    linkedNodeId: input.ghostNodeId,
    pillId: input.pillId ?? null,
  });
  writeProjectionManifest(next);
  return next;
}

function axisIdFromMediaCandidate(
  semanticType: MediaGuideNode["inferredPlaceCandidates"][number]["semanticType"],
): GhostProjectionNode["axisId"] {
  switch (semanticType) {
    case "eatery":
      return "eatery";
    case "lodging":
      return "lodging";
    case "info":
      return "info";
    default:
      return "place";
  }
}

function featureIdFromMediaCandidate(
  semanticType: MediaGuideNode["inferredPlaceCandidates"][number]["semanticType"],
): string | null {
  switch (semanticType) {
    case "eatery":
      return "eatery_search";
    case "lodging":
      return "lodging_search";
    default:
      return null;
  }
}

function buildMediaGuideCandidateGhosts(guide: MediaGuideNode): GhostProjectionNode[] {
  return guide.inferredPlaceCandidates.slice(0, 4).map((candidate, index) => ({
    kind: "ghost",
    id: `ghost:media:${guide.guideNodeId}:${candidate.candidateId}`,
    axisId: axisIdFromMediaCandidate(candidate.semanticType),
    label: candidate.label,
    virtual: true,
    inferred: true,
    featureId: featureIdFromMediaCandidate(candidate.semanticType),
    playbookReasonKo: candidate.whyCandidateKo,
    actionKind: "hub_service",
    href: guide.openUrl,
    internalRoute: false,
    searchQuery: candidate.searchProfile.query,
    lat: candidate.lat,
    lng: candidate.lng,
    mapsUrl: buildGoogleMapsSearchHref(candidate.searchProfile.query),
    emphasis: index === 0 ? "focus" : index < 3 ? "main" : "aux",
    surfacePlacement: candidate.mapPlacement,
    semanticType: candidate.semanticType,
    semanticTypeLabelKo: candidate.semanticTypeLabelKo,
    ontologyRole: "projected",
    relationLabelKo: "미디어 후보",
    relationReasonKo: candidate.whyCandidateKo,
    candidateOrigin: "media_inferred",
    candidateBadgeKo: "미디어 후보",
    candidateConfidence: candidate.confidence,
    sourceGuideNodeId: guide.guideNodeId,
    sourceGuideTitle: guide.title,
    sourceGuideUrl: guide.openUrl,
    sourceGuideSnippetKo: candidate.snippetKo,
    candidateSearchProfile: candidate.searchProfile,
    situationalHintsKo: candidate.situationalHintsKo,
    cuisineHint: candidate.cuisineHint,
  }));
}

function buildSolidLinks(
  anchor: SituationProjectionManifest["nodes"][number] & { kind: "solid" },
  solids: readonly Extract<SituationProjectionManifest["nodes"][number], { kind: "solid" }>[],
): ProjectionLink[] {
  return solids
    .filter((node) => node.id !== anchor.id)
    .map((node) => {
      const semantic = resolveProjectionNodeSemantic(node);
      return {
        id: `link:${anchor.id}:${node.id}`,
        fromId: anchor.id,
        toId: node.id,
        virtual: false,
        reason: "solid_neighbor",
        relationLabelKo: semantic.relationLabelKo,
        relationReasonKo: semantic.relationReasonKo,
        strokeStyle: "solid",
        weight: 62,
      };
    });
}

function buildVirtualLinks(
  anchor: SituationProjectionManifest["nodes"][number] & { kind: "solid" },
  ghosts: readonly GhostProjectionNode[],
): ProjectionLink[] {
  return ghosts.map((ghost) => {
    const semantic = resolveProjectionNodeSemantic(ghost);
    const anchored = ghost.surfacePlacement === "map_anchor";
    const focus = ghost.emphasis === "focus";
    return {
      id: `link:${anchor.id}:${ghost.id}`,
      fromId: anchor.id,
      toId: ghost.id,
      virtual: true,
      reason: "playbook",
      relationLabelKo: semantic.relationLabelKo,
      relationReasonKo: semantic.relationReasonKo,
      strokeStyle: anchored ? "solid" : "dashed",
      weight: focus ? 46 : anchored ? 34 : 28,
    };
  });
}

function mergeById<T extends { id: string }>(
  current: readonly T[],
  next: readonly T[],
): T[] {
  const nextById = new Map(next.map((item) => [item.id, item]));
  const merged: T[] = [];
  for (const item of current) {
    const replacement = nextById.get(item.id);
    if (replacement) {
      merged.push(replacement);
      nextById.delete(item.id);
    }
  }
  for (const item of next) {
    if (nextById.has(item.id)) {
      merged.push(item);
      nextById.delete(item.id);
    }
  }
  return merged;
}

function mergeNodes(
  current: SituationProjectionManifest["nodes"],
  nextGhosts: readonly GhostProjectionNode[],
): SituationProjectionManifest["nodes"] {
  const solids = current.filter((node) => node.kind === "solid");
  const currentGhosts = current.filter(
    (node): node is GhostProjectionNode => node.kind === "ghost",
  );
  return [...solids, ...mergeById(currentGhosts, nextGhosts)];
}

function mergeMindMapLayout(
  current: SituationProjectionManifest,
  next: SituationProjectionManifest,
): SituationProjectionManifest["mindMapLayout"] {
  const nextLayout = computeMindMapLayout(next);
  const currentLayout = current.mindMapLayout;
  if (!currentLayout) {
    return nextLayout;
  }
  const currentById = new Map(currentLayout.nodes.map((node) => [node.id, node]));
  return {
    width: nextLayout.width,
    height: nextLayout.height,
    nodes: nextLayout.nodes.map((node) => {
      const existing = currentById.get(node.id);
      if (!existing) {
        return node;
      }
      return {
        ...node,
        x: existing.x,
        y: existing.y,
      };
    }),
  };
}

export function patchTravelBrainProjectionAnswer(input: {
  event: EventCandidate;
  question: TravelBrainQuestion;
  choice: PersonaLearnChoice;
}): SituationProjectionManifest | null {
  const current = readProjectionManifestForAnchor(input.event.id);
  const route = resolveBrainQuestionRoute(input.event);
  if (!current || current.situationType !== "travel" || route.policy?.sectorId !== "travel") {
    return null;
  }
  recordBrainQuestionFamilyAnswer({
    family: "travel",
    slotId: input.question.slotId,
    choice: input.choice,
  });

  const currentTravelBrain = current.travelBrain ?? buildTravelBrainProjection(input.event);
  const nextTravelBrain = applyTravelBrainAnswer({
    event: input.event,
    projection: currentTravelBrain,
    question: input.question,
    choice: input.choice,
  });
  const solids = current.nodes.filter(
    (node): node is Extract<SituationProjectionManifest["nodes"][number], { kind: "solid" }> =>
      node.kind === "solid",
  );
  const anchor = solids[0];
  if (!anchor) {
    return null;
  }
  const ghosts = travelBrainPolicy.buildResources(input.event, nextTravelBrain);
  const mergedNodes = mergeNodes(current.nodes, ghosts);
  const links = [...buildSolidLinks(anchor, solids), ...buildVirtualLinks(anchor, ghosts)];
  const pills = mergeById(
    current.pills,
    buildHubRunnablePills({
      event: input.event,
      situationType: "travel",
      ghosts,
    }),
  );
  let next: SituationProjectionManifest = {
    ...current,
    manifestId: `sp-${input.event.id}-${Date.now()}`,
    nodes: mergedNodes,
    links,
    pills,
    composedAt: new Date().toISOString(),
    layoutSource: "deterministic",
    travelBrain: nextTravelBrain,
  };
  next = {
    ...next,
    mindMapLayout: mergeMindMapLayout(current, next),
  };
  writeProjectionManifest(next);
  return next;
}

export function patchMediaGuideCandidatesToProjection(input: {
  event: EventCandidate;
  guide: MediaGuideNode;
}): SituationProjectionManifest | null {
  const current =
    readProjectionManifestForAnchor(input.event.id) ??
    composeBrainProjectionManifest({
      event: input.event,
      trigger: { source: "manual", atIso: new Date().toISOString() },
      persist: false,
      requestLlmLayout: false,
    });
  const solids = current.nodes.filter(
    (node): node is Extract<SituationProjectionManifest["nodes"][number], { kind: "solid" }> =>
      node.kind === "solid",
  );
  const anchor = solids[0];
  if (!anchor) {
    return null;
  }

  const mediaGhosts = buildMediaGuideCandidateGhosts(input.guide);
  const preservedGhosts = current.nodes.filter(
    (node): node is GhostProjectionNode =>
      node.kind === "ghost" &&
      !(
        node.candidateOrigin === "media_inferred" &&
        node.sourceGuideNodeId === input.guide.guideNodeId
      ),
  );
  const nextGhosts = [...preservedGhosts, ...mediaGhosts];
  const nextNodes: SituationProjectionManifest["nodes"] = [...solids, ...nextGhosts];
  const links = [...buildSolidLinks(anchor, solids), ...buildVirtualLinks(anchor, nextGhosts)];

  let next: SituationProjectionManifest = {
    ...current,
    manifestId: `sp-${input.event.id}-${Date.now()}`,
    nodes: nextNodes,
    links,
    composedAt: new Date().toISOString(),
    layoutSource: "deterministic",
  };
  next = {
    ...next,
    mindMapLayout: mergeMindMapLayout(current, next),
  };
  writeProjectionManifest(next);
  return next;
}

export function patchMediaGuidesToProjection(input: {
  event: EventCandidate;
  guides: readonly MediaGuideNode[];
  maxGuides?: number;
}): SituationProjectionManifest | null {
  const rows = input.guides.slice(0, input.maxGuides ?? 3);
  let patched: SituationProjectionManifest | null = null;
  for (const guide of rows) {
    patched = patchMediaGuideCandidatesToProjection({
      event: input.event,
      guide,
    });
  }
  return patched;
}
