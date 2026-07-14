/**
 * Merged Hub action log + Engine lifecycle timeline for Context hub rail.
 */

import { buildEngineEventTimelineRows, engineEventPriority } from "@/lib/engine/format-engine-event-timeline";
import type { RimvioEngineEventV1 } from "@/lib/engine/engine-event-metadata";
import { readTeamPitchStatus } from "@/lib/engine/team-collab/read-team-pitch-status";
import type { ContextCapabilityInvocationV1 } from "@/lib/marketplace/context-capability-invocation-metadata";
import {
  buildCapabilityInvocationTimelineRows,
  capabilityInvocationPriority,
} from "@/lib/marketplace/format-capability-invocation-timeline";
import { buildHubActionTimelineRows } from "@/lib/globe/resource/format-hub-action-timeline";
import type { HubAction } from "@/lib/globe/resource/hub-action-record";

export type ContextHubTimelineRowKind = "hub" | "engine" | "capability" | "pitch";

export type ContextHubTimelineRow = {
  id: string;
  labelKo: string;
  status: HubAction["status"];
  atIso: string;
  kind: ContextHubTimelineRowKind;
  providerMemberId?: string;
};

type TimelineCandidate = ContextHubTimelineRow & {
  priority: number;
};

function hubActionPriority(action: HubAction): number {
  if (action.status !== "success") {
    return 10;
  }
  switch (action.type) {
    case "purchase":
      return 0;
    case "reserve":
      return 1;
    case "search":
      return 2;
    default:
      return 3;
  }
}

/** Recent Context activity — commits + engine milestones + capability invocations. */
export function buildContextHubTimelineRows(
  hubLog: readonly HubAction[],
  engineEvents: readonly RimvioEngineEventV1[],
  capabilityInvocations: readonly ContextCapabilityInvocationV1[] = [],
  max = 5,
  metadata?: Record<string, unknown> | null,
): ContextHubTimelineRow[] {
  const hubById = new Map(hubLog.map((action) => [action.actionId, action]));

  const hubRows: TimelineCandidate[] = buildHubActionTimelineRows(hubLog, max).map(
    (row) => ({
      id: `hub:${row.actionId}`,
      labelKo: row.labelKo,
      status: row.status,
      atIso: row.createdAt,
      kind: "hub" as const,
      priority: hubActionPriority(hubById.get(row.actionId)!),
    }),
  );

  const engineById = new Map(engineEvents.map((event) => [event.id, event]));

  const engineRows: TimelineCandidate[] = buildEngineEventTimelineRows(
    engineEvents,
    max,
  ).map((row) => ({
    id: `eng:${row.id}`,
    labelKo: row.labelKo,
    status: "success" as const,
    atIso: row.atIso,
    kind: "engine" as const,
    priority: engineEventPriority(engineById.get(row.id)!),
  }));

  const invocationById = new Map(
    capabilityInvocations.map((invocation) => [invocation.id, invocation]),
  );

  const capabilityRows: TimelineCandidate[] = buildCapabilityInvocationTimelineRows(
    capabilityInvocations,
    max,
  ).map((row) => ({
    id: `cap:${row.id}`,
    labelKo: row.labelKo,
    status: row.success ? ("success" as const) : ("failed" as const),
    atIso: row.atIso,
    kind: "capability" as const,
    providerMemberId: row.providerMemberId,
    priority: capabilityInvocationPriority(invocationById.get(row.id)!),
  }));

  const pitch = metadata ? readTeamPitchStatus(metadata) : null;
  const pitchRows: TimelineCandidate[] =
    pitch && pitch.labelKo !== "볼: 지구"
      ? [
          {
            id: "pitch:ball",
            labelKo: pitch.labelKo,
            status: "success" as const,
            atIso: new Date().toISOString(),
            kind: "pitch" as const,
            priority: -1,
          },
        ]
      : [];

  return [...pitchRows, ...hubRows, ...engineRows, ...capabilityRows]
    .sort((left, right) => {
      const priority = left.priority - right.priority;
      if (priority !== 0) {
        return priority;
      }
      return right.atIso.localeCompare(left.atIso);
    })
    .slice(0, max)
    .map(({ priority: _priority, ...row }) => row);
}
