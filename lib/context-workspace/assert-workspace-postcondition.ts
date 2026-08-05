/**
 * Postcondition Verification — Observation after Patch/Scout (ADR-045 Verify).
 * Never claim success from Tool return alone; read Workspace State.
 */

import type { ContextWorkspaceState } from "@/lib/context-workspace/types";
import { metersBetween } from "@/lib/context-workspace/reality-anchor/distance-gate";

export type NearScoutPostconditionExpect = {
  readonly kind: "near_scout";
  /** Reality Anchor geo / node id (optional match). */
  readonly anchorId?: string | null;
  readonly anchorLat: number;
  readonly anchorLng: number;
  readonly radiusMeters: number;
  /** Expected scout domain kind on Workspace nodes. */
  readonly candidateKind: "lodging" | "eatery" | "poi" | "amenity";
  readonly minCandidates?: number;
};

export type WorkspacePostconditionExpect = NearScoutPostconditionExpect;

export type WorkspacePostconditionPass = {
  readonly ok: true;
  readonly code: "PASS";
  readonly detailKo: string;
};

export type WorkspacePostconditionFail = {
  readonly ok: false;
  readonly code:
    | "ANCHOR_MISSING"
    | "CANDIDATES_MISSING"
    | "CANDIDATES_OUT_OF_RADIUS"
    | "STATE_UNREADABLE";
  readonly detailKo: string;
};

export type WorkspacePostconditionResult =
  | WorkspacePostconditionPass
  | WorkspacePostconditionFail;

function hasAnchorNode(
  state: ContextWorkspaceState,
  expect: NearScoutPostconditionExpect,
): boolean {
  return state.nodes.some((n) => {
    if (!n.visible) return false;
    const isAnchor =
      n.source === "reality_anchor" ||
      n.tags.includes("reality_anchor") ||
      n.tags.includes("place_locate") ||
      (expect.anchorId != null &&
        (n.id === expect.anchorId || n.placeId === expect.anchorId));
    if (!isAnchor) return false;
    if (!Number.isFinite(n.lat) || !Number.isFinite(n.lng)) return false;
    const m = metersBetween(
      expect.anchorLat,
      expect.anchorLng,
      n.lat,
      n.lng,
    );
    return m <= 50; // same pin / tiny float
  });
}

function inRadiusCandidates(
  state: ContextWorkspaceState,
  expect: NearScoutPostconditionExpect,
): number {
  return state.nodes.filter((n) => {
    if (!n.visible || n.kind !== expect.candidateKind) return false;
    if (
      n.source === "reality_anchor" ||
      n.tags.includes("reality_anchor") ||
      n.tags.includes("place_locate")
    ) {
      return false;
    }
    if (!Number.isFinite(n.lat) || !Number.isFinite(n.lng)) return false;
    const m = metersBetween(
      expect.anchorLat,
      expect.anchorLng,
      n.lat,
      n.lng,
    );
    return m <= expect.radiusMeters;
  }).length;
}

/**
 * Assert expected Workspace postcondition after an Agent mutation.
 */
export function assertWorkspacePostcondition(input: {
  readonly state: ContextWorkspaceState | null | undefined;
  readonly expect: WorkspacePostconditionExpect;
}): WorkspacePostconditionResult {
  const state = input.state;
  if (!state) {
    return {
      ok: false,
      code: "STATE_UNREADABLE",
      detailKo: "Workspace를 읽지 못했어요",
    };
  }

  const expect = input.expect;
  if (expect.kind !== "near_scout") {
    return {
      ok: false,
      code: "STATE_UNREADABLE",
      detailKo: "알 수 없는 postcondition",
    };
  }

  if (!hasAnchorNode(state, expect)) {
    return {
      ok: false,
      code: "ANCHOR_MISSING",
      detailKo: "기준점 Anchor가 Workspace에 없어요",
    };
  }

  const min = expect.minCandidates ?? 1;
  const count = inRadiusCandidates(state, expect);
  if (count < min) {
    // Distinguish no candidates vs only far ones of that kind
    const anyKind = state.nodes.some(
      (n) =>
        n.visible &&
        n.kind === expect.candidateKind &&
        n.source !== "reality_anchor" &&
        !n.tags.includes("reality_anchor"),
    );
    return {
      ok: false,
      code: anyKind ? "CANDIDATES_OUT_OF_RADIUS" : "CANDIDATES_MISSING",
      detailKo: anyKind
        ? `반경 ${expect.radiusMeters}m 안 ${expect.candidateKind} 후보가 없어요`
        : `${expect.candidateKind} 후보가 Workspace에 없어요`,
    };
  }

  return {
    ok: true,
    code: "PASS",
    detailKo: `기준점 · ${expect.candidateKind} ${count}곳 · ${expect.radiusMeters}m 안`,
  };
}
