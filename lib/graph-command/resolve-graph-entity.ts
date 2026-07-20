/**
 * Entity Resolver for Graph Command — label → nodeId with context/distance/pin weight.
 */

import type {
  GraphEntityRef,
  SessionGraphNode,
  SessionGraphV1,
} from "@/lib/graph-command/types";

export type GraphEntityResolveInput = {
  readonly labelKo: string;
  readonly graph: SessionGraphV1 | null;
  readonly viewerLat?: number | null;
  readonly viewerLng?: number | null;
};

export type GraphEntityResolveHit = {
  readonly ref: GraphEntityRef;
  readonly node: SessionGraphNode | null;
  readonly score: number;
  readonly reasonKo: string;
};

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

function scoreNode(
  node: SessionGraphNode,
  needle: string,
  input: GraphEntityResolveInput,
): { score: number; reasonKo: string } {
  let score = 0;
  const reasons: string[] = [];
  const label = node.labelKo;

  if (label === needle) {
    score += 100;
    reasons.push("정확 일치");
  } else if (label.includes(needle) || needle.includes(label)) {
    score += 55;
    reasons.push("이름 부분 일치");
  } else {
    return { score: 0, reasonKo: "" };
  }

  if (node.pinned) {
    score += 25;
    reasons.push("고정");
  }
  if (input.graph?.selectionIds.includes(node.id)) {
    score += 20;
    reasons.push("선택됨");
  }
  if (node.alwaysVisible) {
    score += 8;
    reasons.push("항상 표시");
  }

  if (
    input.viewerLat != null &&
    input.viewerLng != null &&
    node.lat != null &&
    node.lng != null
  ) {
    const km = haversineKm(
      input.viewerLat,
      input.viewerLng,
      node.lat,
      node.lng,
    );
    if (km < 0.5) {
      score += 18;
      reasons.push("매우 가까움");
    } else if (km < 2) {
      score += 10;
      reasons.push("가까움");
    }
  }

  if (node.kind === "lodging" && /호텔|숙소|APA|hotel/iu.test(needle)) {
    score += 6;
  }
  if (node.kind === "eatery" && /맛집|식당|cafe|고기/iu.test(needle)) {
    score += 6;
  }

  return { score, reasonKo: reasons.join(" · ") || "후보" };
}

/**
 * Resolve "A호텔" against session graph candidates (APA Namba vs Umeda).
 */
export function resolveGraphEntity(
  input: GraphEntityResolveInput,
): GraphEntityResolveHit {
  const needle = input.labelKo.trim();
  if (!needle) {
    return {
      ref: { labelKo: "", nodeId: null },
      node: null,
      score: 0,
      reasonKo: "빈 이름",
    };
  }

  if (!input.graph?.nodes.length) {
    return {
      ref: { labelKo: needle, nodeId: null },
      node: null,
      score: 0,
      reasonKo: "그래프에 후보 없음",
    };
  }

  let best: GraphEntityResolveHit | null = null;
  for (const node of input.graph.nodes) {
    if (node.kind === "compare" || node.kind === "group" || node.kind === "note") {
      continue;
    }
    const { score, reasonKo } = scoreNode(node, needle, input);
    if (score <= 0) {
      continue;
    }
    if (!best || score > best.score) {
      best = {
        ref: { labelKo: node.labelKo, nodeId: node.id },
        node,
        score,
        reasonKo,
      };
    }
  }

  return (
    best ?? {
      ref: { labelKo: needle, nodeId: null },
      node: null,
      score: 0,
      reasonKo: "일치 없음",
    }
  );
}

export function resolveGraphEntityRef(
  graph: SessionGraphV1 | null,
  labelKo: string,
  viewerLat?: number | null,
  viewerLng?: number | null,
): GraphEntityRef {
  return resolveGraphEntity({
    labelKo,
    graph,
    viewerLat,
    viewerLng,
  }).ref;
}
