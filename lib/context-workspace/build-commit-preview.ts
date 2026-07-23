/**
 * Commit Preview summary — what Reality Commit will root on the Globe.
 */

import {
  domainLabelKo,
  type ContextWorkspaceState,
} from "@/lib/context-workspace/types";

export type WorkspaceCommitPreviewLine = {
  readonly kind: "add" | "filter" | "route" | "budget" | "other";
  readonly textKo: string;
};

export type WorkspaceCommitPreview = {
  readonly titleKo: string;
  readonly lines: readonly WorkspaceCommitPreviewLine[];
  readonly commitCount: number;
  readonly domainLabelKo: string;
};

export function buildWorkspaceCommitPreview(
  state: ContextWorkspaceState,
): WorkspaceCommitPreview {
  const visible = state.nodes.filter((n) => n.visible);
  const domain = domainLabelKo(state.domain);
  const lines: WorkspaceCommitPreviewLine[] = [];

  const byKind = new Map<string, number>();
  for (const n of visible) {
    const label = domainLabelKo(n.kind);
    byKind.set(label, (byKind.get(label) ?? 0) + 1);
  }
  for (const [label, count] of byKind) {
    lines.push({
      kind: "add",
      textKo: `${label} ${count}개 추가`,
    });
  }

  if (
    state.filter.minRating != null ||
    state.filter.maxPriceBand != null ||
    (state.filter.tagIncludes?.length ?? 0) > 0
  ) {
    const bits: string[] = [];
    if (state.filter.minRating != null) {
      bits.push(`평점 ${state.filter.minRating}+`);
    }
    if (state.filter.maxPriceBand != null) {
      bits.push(`가격대 ≤${state.filter.maxPriceBand}`);
    }
    if (state.filter.tagIncludes?.length) {
      bits.push(state.filter.tagIncludes.join(" · "));
    }
    lines.push({
      kind: "filter",
      textKo: `필터 적용 · ${bits.join(" · ")}`,
    });
  }

  if (state.compareIds.length >= 2) {
    lines.push({
      kind: "other",
      textKo: `${state.compareIds.length}곳 비교 선택`,
    });
  }

  if (state.lastChangeKo && /동선|가정|비 오면|예산/i.test(state.lastChangeKo)) {
    lines.push({
      kind: /동선/.test(state.lastChangeKo) ? "route" : "other",
      textKo: state.lastChangeKo,
    });
  }

  if (lines.length === 0) {
    lines.push({
      kind: "add",
      textKo: `보이는 ${domain} ${visible.length}곳`,
    });
  }

  return {
    titleKo: "이번 변경",
    lines,
    commitCount: visible.length,
    domainLabelKo: domain,
  };
}
