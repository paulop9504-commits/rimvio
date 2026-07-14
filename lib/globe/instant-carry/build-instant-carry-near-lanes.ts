import {
  resolveEntities,
  type ResolvedEntity,
} from "@/lib/entity-resolver";
import type { GlobeContextTrigger } from "@/lib/globe/context-triggers/globe-context-trigger-types";
import type { GlobeResumeSession } from "@/lib/globe/globe-resume-session";
import {
  anchorsToResolvedEntities,
  isNearCapableEntity,
  readInstantCarryEntityAnchors,
} from "@/lib/globe/instant-carry/instant-carry-entity-anchor-store";
import type {
  InstantCarryNearLane,
  InstantCarryPoster,
} from "@/lib/globe/instant-carry/types";

function posterFromTrigger(trigger: GlobeContextTrigger): InstantCarryPoster {
  const hook = trigger.body?.trim() || trigger.title?.trim() || "그때 거기";
  return {
    id: trigger.id,
    trigger,
    hook,
    meta: null,
  };
}

function entityNeedles(entity: ResolvedEntity): string[] {
  return [entity.label, entity.queryFocus, ...entity.aliases]
    .map((row) => row?.trim().toLowerCase())
    .filter((row): row is string => Boolean(row));
}

export function triggerMatchesNearEntity(
  trigger: GlobeContextTrigger,
  entity: ResolvedEntity,
): boolean {
  const blob = `${trigger.title} ${trigger.body}`.toLowerCase();
  return entityNeedles(entity).some((needle) => blob.includes(needle));
}

function collectUtteranceBlobs(input: {
  resume: GlobeResumeSession | null;
  showResume: boolean;
  triggers: readonly GlobeContextTrigger[];
}): string[] {
  const blobs: string[] = [];
  if (input.showResume && input.resume) {
    const parts = [input.resume.title, input.resume.placeLabel]
      .map((row) => row?.trim())
      .filter(Boolean);
    if (parts.length) {
      blobs.push(parts.join(" "));
    }
  }
  for (const trigger of input.triggers) {
    const line = `${trigger.title} ${trigger.body}`.trim();
    if (line) {
      blobs.push(line);
    }
  }
  return blobs;
}

function dedupeEntities(entities: readonly ResolvedEntity[]): ResolvedEntity[] {
  const byId = new Map<string, ResolvedEntity>();
  for (const row of entities) {
    const prior = byId.get(row.id);
    if (!prior || row.confidence > prior.confidence) {
      byId.set(row.id, row);
    }
  }
  return [...byId.values()].sort((a, b) => b.confidence - a.confidence);
}

/** Resolve near-capable entities from personal text + scout anchors. */
export function resolveInstantCarryNearEntities(input: {
  resume: GlobeResumeSession | null;
  showResume: boolean;
  triggers: readonly GlobeContextTrigger[];
  nowMs?: number;
}): ResolvedEntity[] {
  const fromText: ResolvedEntity[] = [];
  for (const blob of collectUtteranceBlobs(input)) {
    fromText.push(
      ...resolveEntities(blob).entities.filter(isNearCapableEntity),
    );
  }
  const fromAnchors = anchorsToResolvedEntities(
    readInstantCarryEntityAnchors(input.nowMs),
  ).filter(isNearCapableEntity);
  return dedupeEntities([...fromText, ...fromAnchors]);
}

export function buildInstantCarryNearLanes(input: {
  resume: GlobeResumeSession | null;
  showResume: boolean;
  triggers: readonly GlobeContextTrigger[];
  nowMs?: number;
  limit?: number;
}): InstantCarryNearLane[] {
  const entities = resolveInstantCarryNearEntities(input);
  const limit = input.limit ?? 3;
  const lanes: InstantCarryNearLane[] = [];

  for (const entity of entities) {
    if (lanes.length >= limit) {
      break;
    }
    const matched = input.triggers
      .filter((trigger) => triggerMatchesNearEntity(trigger, entity))
      .map(posterFromTrigger);
    const label = entity.label.trim();
    if (!label) {
      continue;
    }
    lanes.push({
      id: `near:${entity.id}`,
      title: `${label} 근처`,
      entityLabel: label,
      entityKind: entity.kind,
      seedQuery: `${label} 근처`,
      posters: matched.slice(0, 8),
    });
  }

  return lanes;
}
