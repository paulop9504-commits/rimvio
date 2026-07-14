import type { RealityGraphResolveHit, WorldGeoKind, WorldGeoNode } from "@/lib/reality-graph/types";
import { resolveWorldGeoEntity } from "@/lib/reality-graph/resolve-world-geo";

const PREFECTURE_KINDS: ReadonlySet<WorldGeoKind> = new Set([
  "prefecture",
  "metropolis",
]);

/**
 * 「도쿄 무슨 현이야?」 → graph answer, not web search.
 */
export function answerAdminDivisionQuestion(text: string): {
  hit: RealityGraphResolveHit;
  answerKo: string;
  adminNode: WorldGeoNode;
} | null {
  const hit = resolveWorldGeoEntity(text);
  if (!hit) {
    return null;
  }

  const asksDivision =
    /(?:무슨\s*현|어느\s*현|현이야|도야|도\s*야|부야|어떤\s*(?:현|도|부)|prefecture|which\s+prefecture)/iu.test(
      text,
    );

  if (!asksDivision) {
    return null;
  }

  const adminNode =
    PREFECTURE_KINDS.has(hit.node.kind)
      ? hit.node
      : [...hit.ancestors].reverse().find((n) => PREFECTURE_KINDS.has(n.kind)) ?? null;

  if (!adminNode) {
    return null;
  }

  const kindKo =
    adminNode.kind === "metropolis"
      ? "도"
      : adminNode.labels.ko.endsWith("부")
        ? "부"
        : "현급 행정구역";

  const answerKo =
    adminNode.kind === "metropolis"
      ? `${hit.node.labels.ko}은(는) ${adminNode.labels.ko}(${adminNode.labels.en})에 속합니다. 도쿄는 현이 아니라 도(都)입니다.`
      : `${hit.node.labels.ko}은(는) ${adminNode.labels.ko}(${adminNode.labels.en}, ${kindKo})입니다.`;

  return { hit, answerKo, adminNode };
}

/** Hierarchy line for UI / Operator: Japan → Tokyo → Shinjuku */
export function formatWorldGeoHierarchyKo(hit: RealityGraphResolveHit): string {
  const path = [...hit.ancestors.filter((n) => n.kind !== "world" && n.kind !== "continent"), hit.node];
  return path.map((n) => n.labels.ko).join(" → ");
}

export function formatWorldGeoHierarchyEn(hit: RealityGraphResolveHit): string {
  const path = [...hit.ancestors.filter((n) => n.kind !== "world" && n.kind !== "continent"), hit.node];
  return path.map((n) => n.labels.en).join(" → ");
}
