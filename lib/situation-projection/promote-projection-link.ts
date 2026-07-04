import type { EventCandidate } from "@/lib/events/event-candidate";
import type {
  HubRunnablePill,
  ProjectionLink,
  SituationProjectionManifest,
} from "@/lib/situation-projection/types";

/** After user commits (form/capture), thicken link + solidify pill in projection only. */
export function promoteProjectionAfterUserCommit(input: {
  manifest: SituationProjectionManifest;
  linkedNodeId: string;
  pillId?: string | null;
  atIso?: string;
}): SituationProjectionManifest {
  const atIso = input.atIso ?? new Date().toISOString();
  const { manifest } = input;
  const links: ProjectionLink[] = manifest.links.map((link) => {
    if (link.toId !== input.linkedNodeId && link.fromId !== input.linkedNodeId) {
      return link;
    }
    return {
      ...link,
      virtual: false,
      strokeStyle: "solid",
      weight: Math.min(100, (link.weight ?? 40) + 35),
      reason: "user_promoted",
    };
  });

  const pills: HubRunnablePill[] = manifest.pills.map((pill) => {
    if (pill.id !== input.pillId && pill.linkedNodeId !== input.linkedNodeId) {
      return pill;
    }
    return {
      ...pill,
      kind: "solid",
      virtual: false,
      priority: Math.max(0, pill.priority - 10),
    };
  });

  return {
    ...manifest,
    links,
    pills,
    composedAt: atIso,
  };
}

export function annotateCaregivingKnowledgeGhost(
  ghosts: import("@/lib/situation-projection/types").GhostProjectionNode[],
  situationType: import("@/lib/situation-projection/types").SituationType,
): import("@/lib/situation-projection/types").GhostProjectionNode[] {
  if (situationType !== "caregiving") {
    return ghosts;
  }
  return ghosts.map((ghost) => {
    if (ghost.axisId !== "insurance") {
      return ghost;
    }
    return {
      ...ghost,
      knowledgeBoxLabel: "보험서류함",
      label: "보험서류함",
    };
  });
}

/** Insurance axis ghost id helper for promotion tests. */
export function insuranceGhostNodeId(): string {
  return "ghost:insurance";
}

export type KnowledgePlacementSuggestion = {
  anchorEventId: string;
  anchorTitle: string;
  knowledgeBoxLabel: string;
  ghostNodeId: string;
  confidence: "high" | "medium";
  reasonKo: string;
};

const INSURANCE_DOC_PATTERN =
  /보험|청구|진단서|의료비|실비|보험금|claim|insurance/i;

/** Deterministic — suggest placing capture into caregiving knowledge box. */
export function suggestKnowledgePlacement(input: {
  captureLabel?: string | null;
  captureFileName?: string | null;
  candidateEvents: readonly EventCandidate[];
}): KnowledgePlacementSuggestion | null {
  const blob = [input.captureLabel, input.captureFileName].filter(Boolean).join(" ");
  if (!INSURANCE_DOC_PATTERN.test(blob)) {
    return null;
  }

  const caregiving = input.candidateEvents.find((event) => {
    const text = `${event.title} ${event.place ?? ""}`;
    return /암|진단|병원|치료|어머니|아버지|부모|엄마|아빠/i.test(text);
  });

  if (!caregiving) {
    return null;
  }

  return {
    anchorEventId: caregiving.id,
    anchorTitle: caregiving.title.trim(),
    knowledgeBoxLabel: "보험서류함",
    ghostNodeId: insuranceGhostNodeId(),
    confidence: /보험|청구|실비/.test(blob) ? "high" : "medium",
    reasonKo: "보험·청구 서류로 보여요",
  };
}
