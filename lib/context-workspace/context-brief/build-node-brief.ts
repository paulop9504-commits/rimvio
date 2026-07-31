/**
 * Node Mini Brief — 3 lines for Peek (role · distance · next action).
 */

import type { ContextWorkspaceNode } from "@/lib/context-workspace/types";
import type { NodeContextBrief } from "@/lib/context-workspace/context-brief/types";

function roleLabel(node: ContextWorkspaceNode): string | null {
  if (/공항|airport|kix/iu.test(node.title)) return "도착 · 이동";
  if (node.kind === "lodging") return "숙소 · 동선 중심";
  if (node.kind === "eatery") return "맛집";
  if (/usj|유니버설/iu.test(node.title)) return "핵심 체험";
  if (node.tags.includes("anchor")) return "출발 앵커";
  if (node.kind === "poi" || node.kind === "amenity") return "일정 장소";
  return null;
}

function actionLine(node: ContextWorkspaceNode): string {
  if (node.kind === "lodging") return "예약 준비 가능";
  if (node.kind === "eatery") return "자리·예약 준비 가능";
  if (/usj|유니버설|티켓|입장/iu.test(`${node.title} ${node.amountLabel ?? ""}`)) {
    return "티켓·일정 연결 가능";
  }
  return "지도·일정에 연결";
}

/**
 * Compact Peek lines from node metadata only.
 */
export function buildNodeContextBrief(
  node: ContextWorkspaceNode,
  opts?: {
    readonly dayIndex?: number | null;
    readonly anchorTitle?: string | null;
  },
): NodeContextBrief {
  const lines: string[] = [];
  const day =
    typeof opts?.dayIndex === "number" && opts.dayIndex >= 0
      ? `Day ${opts.dayIndex + 1}`
      : null;
  const role = roleLabel(node);
  if (day && role) {
    lines.push(`${day} · ${role}`);
  } else if (role) {
    lines.push(role);
  } else if (day) {
    lines.push(day);
  }

  const walk = node.summaryKo.match(/(\d+)\s*분/u);
  if (walk) {
    const anchor = opts?.anchorTitle?.trim();
    lines.push(
      anchor
        ? `${anchor} 기준 약 ${walk[1]}분`
        : `이동 약 ${walk[1]}분`,
    );
  } else if (node.amountLabel?.trim()) {
    lines.push(node.amountLabel.trim());
  } else if (node.rating != null && Number.isFinite(node.rating)) {
    lines.push(`평점 ${node.rating.toFixed(1)}`);
  }

  lines.push(actionLine(node));

  return {
    roleLabelKo: role,
    linesKo: lines.slice(0, 3),
  };
}
