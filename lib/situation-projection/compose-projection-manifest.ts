import type { EventCandidate } from "@/lib/events/event-candidate";
import { buildHubRunnablePills } from "@/lib/situation-projection/build-hub-runnable-pills";
import { resolveBrainQuestionRoute } from "@/lib/situation-projection/brain-question-router";
import {
  describeGhostProjectionNodeSemantic,
  resolveProjectionNodeSemantic,
} from "@/lib/situation-projection/ontology-semantic";
import { ghostPlaybookForSituation } from "@/lib/situation-projection/playbooks";
import { annotateCaregivingKnowledgeGhost } from "@/lib/situation-projection/promote-projection-link";
import { readSolidAnchorsForEvent } from "@/lib/situation-projection/read-solid-anchors";
import { travelBrainPolicy } from "@/lib/situation-projection/travel-brain-policy";
import { readEateryInventoryRows } from "@/lib/globe/eatery/read-eatery-resource-inventory";
import type {
  GhostProjectionNode,
  ProjectionLink,
  ProjectionSurfaceKind,
  SituationProjectionManifest,
  SituationProjectionTrigger,
  SolidProjectionNode,
} from "@/lib/situation-projection/types";
import { SITUATION_PROJECTION_CONTRACT_VERSION } from "@/lib/situation-projection/types";

function existingSolidAxisIds(solids: readonly SolidProjectionNode[]): Set<string> {
  const axes = new Set<string>();
  for (const node of solids) {
    if (node.id.includes(":place:")) {
      axes.add("place");
    }
    if (node.id.includes(":person:")) {
      axes.add("people");
    }
    if (node.entityId?.startsWith("thread:")) {
      axes.add("thread");
    }
  }
  return axes;
}

function buildGhostNodes(
  event: EventCandidate,
  situationType: SituationProjectionManifest["situationType"],
  solids: readonly SolidProjectionNode[],
): GhostProjectionNode[] {
  const route = resolveBrainQuestionRoute(event);
  if (route.policy?.sectorId === "travel") {
    return travelBrainPolicy.buildResources(event, travelBrainPolicy.buildProjection(event));
  }

  const covered = existingSolidAxisIds(solids);
  const ghosts: GhostProjectionNode[] = [];
  const eateryRows = readEateryInventoryRows(event).slice(0, 3);

  for (const entry of ghostPlaybookForSituation(situationType)) {
    if (covered.has(entry.axisId)) {
      continue;
    }
    if (entry.axisId === "eatery" && eateryRows.length > 0) {
      continue;
    }
    const semantic = describeGhostProjectionNodeSemantic({
      axisId: entry.axisId,
      relationReasonKo: entry.reasonKo,
    });
    ghosts.push({
      kind: "ghost",
      id: `ghost:${entry.axisId}`,
      axisId: entry.axisId,
      label: entry.labelKo,
      virtual: true,
      featureId: entry.featureId ?? null,
      playbookReasonKo: entry.reasonKo,
      semanticType: semantic.semanticType,
      semanticTypeLabelKo: semantic.semanticTypeLabelKo,
      ontologyRole: semantic.ontologyRole,
      relationLabelKo: semantic.relationLabelKo,
      relationReasonKo: semantic.relationReasonKo,
    });
  }

  if (eateryRows.length > 0) {
    for (const row of eateryRows) {
      const relationReasonKo =
        row.specialReasonKo ??
        row.cuisineHint ??
        row.categoryLabel ??
        "이 맥락과 이어지는 맛집 후보";
      const semantic = describeGhostProjectionNodeSemantic({
        axisId: "eatery",
        relationReasonKo,
      });
      ghosts.push({
        kind: "ghost",
        id: `ghost:eatery:${row.placeId}`,
        axisId: "eatery",
        label: row.name,
        virtual: true,
        inferred: true,
        featureId: "eatery_search",
        playbookReasonKo: relationReasonKo,
        searchQuery: `${event.place?.trim() || event.title.trim()} ${row.name}`.trim(),
        placeId: row.placeId,
        lat: row.lat,
        lng: row.lng,
        mapsUrl: row.mapsUrl ?? null,
        semanticType: semantic.semanticType,
        semanticTypeLabelKo: semantic.semanticTypeLabelKo,
        ontologyRole: semantic.ontologyRole,
        relationLabelKo: semantic.relationLabelKo,
        relationReasonKo: semantic.relationReasonKo,
      });
    }
  }

  return ghosts;
}

function buildSolidLinks(
  anchor: SolidProjectionNode,
  solids: readonly SolidProjectionNode[],
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
  anchor: SolidProjectionNode,
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

export type ComposeProjectionManifestInput = {
  event: EventCandidate;
  trigger: SituationProjectionTrigger;
  surfaceKind?: ProjectionSurfaceKind;
  now?: Date;
};

/**
 * Deterministic projection composer — solid from truth, ghost from playbook.
 * AI layout pass may only reorder nodes / pick surfaceKind among allowed enum later.
 */
export function composeSituationProjectionManifest(
  input: ComposeProjectionManifestInput,
): SituationProjectionManifest {
  const now = input.now ?? new Date();
  const route = resolveBrainQuestionRoute(input.event);
  const situationType = route.situationType;
  const solids = readSolidAnchorsForEvent(input.event);
  const anchor = solids[0];
  if (!anchor) {
    throw new Error("projection_anchor_missing");
  }
  let ghosts = buildGhostNodes(input.event, situationType, solids);
  ghosts = annotateCaregivingKnowledgeGhost(ghosts, situationType);
  const links = [...buildSolidLinks(anchor, solids), ...buildVirtualLinks(anchor, ghosts)];
  const pills = buildHubRunnablePills({ event: input.event, situationType, ghosts });
  const travelBrain =
    route.policy?.sectorId === "travel"
      ? travelBrainPolicy.buildProjection(input.event)
      : null;

  const ghostHeavy = ghosts.length >= 3;
  const surfaceKind: ProjectionSurfaceKind =
    input.surfaceKind ??
    (situationType === "caregiving" && ghostHeavy
      ? "situation_map"
      : ghostHeavy
        ? "prep_card"
        : "quiet");

  return {
    version: SITUATION_PROJECTION_CONTRACT_VERSION,
    manifestId: `sp-${input.event.id}-${now.getTime()}`,
    situationType,
    anchorEventId: input.event.id,
    trigger: input.trigger,
    surfaceKind,
    nodes: [...solids, ...ghosts],
    links,
    pills,
    composedAt: now.toISOString(),
    readOnly: true,
    layoutSource: "deterministic",
    travelBrain,
  };
}
