/**
 * P1 · Postcondition Check — never claim success when Workspace did not match.
 */

import { readContextWorkspace } from "@/lib/context-workspace/workspace-store";
import type { AgentJobTarget } from "@/lib/agent-policy/agent-job";
import { metersBetween } from "@/lib/context-workspace/reality-anchor/distance-gate";

export type PostconditionExpect = {
  readonly target?: AgentJobTarget | null;
  readonly requireVisibleDomain?: boolean;
  readonly anchorLat?: number | null;
  readonly anchorLng?: number | null;
  readonly maxDistanceMeters?: number | null;
  readonly workspaceMutated?: boolean;
  /** P5 — at least N visible nodes (after scout / soft keep). */
  readonly minVisible?: number | null;
  /** P5 — some node must carry day_N tag. */
  readonly requireDay?: number | null;
};

export type PostconditionResult =
  | { readonly ok: true; readonly statusKo: string | null }
  | {
      readonly ok: false;
      readonly statusKo: string;
      readonly reason:
        | "no_entities"
        | "wrong_domain"
        | "anchor_distance"
        | "no_mutation";
    };

function domainMatchesTarget(
  kind: string,
  target: AgentJobTarget | null | undefined,
): boolean {
  if (!target || target === "mixed" || target === "map") return true;
  if (target === "lodging") return kind === "lodging";
  if (target === "eatery") return kind === "eatery";
  if (target === "poi") return kind === "poi";
  if (target === "amenity") return kind === "amenity" || kind === "poi";
  return true;
}

/**
 * After Tool / Patch — verify Workspace matches Expected before "완료" copy.
 */
export function assertAgentPostcondition(input: {
  readonly contextEventId: string;
  readonly expect: PostconditionExpect;
}): PostconditionResult {
  const state = readContextWorkspace(input.contextEventId);
  if (!state) {
    return {
      ok: false,
      reason: "no_mutation",
      statusKo: "Workspace에 반영되지 않았어요",
    };
  }

  if (input.expect.workspaceMutated === true) {
    const visible = state.nodes.filter((n) => n.visible);
    const target = input.expect.target;
    const domainHits = visible.filter((n) =>
      domainMatchesTarget(n.kind, target),
    );

    if (input.expect.requireVisibleDomain !== false && target && target !== "map") {
      if (domainHits.length === 0) {
        return {
          ok: false,
          reason: "no_entities",
          statusKo: "추가했다고 했지만 작업장에 후보가 없어요",
        };
      }
    }

    const aLat = input.expect.anchorLat;
    const aLng = input.expect.anchorLng;
    const maxM = input.expect.maxDistanceMeters ?? 800;
    if (
      typeof aLat === "number" &&
      typeof aLng === "number" &&
      Number.isFinite(aLat) &&
      Number.isFinite(aLng) &&
      domainHits.length > 0
    ) {
      const within = domainHits.filter(
        (n) =>
          typeof n.lat === "number" &&
          typeof n.lng === "number" &&
          metersBetween(aLat, aLng, n.lat, n.lng) <= maxM,
      );
      if (within.length === 0) {
        return {
          ok: false,
          reason: "anchor_distance",
          statusKo: `기준점 ${maxM}m 안에 맞는 결과가 없어요`,
        };
      }
    }

    const minVisible = input.expect.minVisible;
    if (minVisible != null && minVisible > 0) {
      const count =
        target && target !== "map" ? domainHits.length : visible.length;
      if (count < minVisible) {
        return {
          ok: false,
          reason: "no_entities",
          statusKo: `후보가 ${minVisible}곳보다 적어요`,
        };
      }
    }

    const requireDay = input.expect.requireDay;
    if (requireDay != null && requireDay >= 1) {
      const dayRe = new RegExp(`^day[_-]?${requireDay}$`, "iu");
      const onDay = state.nodes.filter((n) =>
        n.tags.some((t) => dayRe.test(t)),
      );
      if (onDay.length === 0) {
        return {
          ok: false,
          reason: "no_mutation",
          statusKo: `Day ${requireDay} 일정에 반영되지 않았어요`,
        };
      }
    }
  }

  return { ok: true, statusKo: null };
}
