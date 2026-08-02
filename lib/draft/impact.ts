/**
 * Draft Impact — candidate universe delta for Reality Diff UX.
 *
 * Impact is preview-only. Never mutates Reality.
 */

export type DraftImpact = {
  /** e.g. -80 for 5→1 */
  readonly deltaPct: number | null;
  readonly beforeVisibleCount: number;
  readonly afterVisibleCount: number;
  readonly candidatesRemoved: number;
  /** "-80%" */
  readonly pctLabelKo: string;
  /** "후보 감소" | "후보 증가" | "변화 없음" */
  readonly effectLabelKo: string;
  /** "-80% · 후보 감소" */
  readonly labelKo: string;
  readonly summaryKo: string;
  readonly details: Readonly<Record<string, unknown>>;
};

/**
 * Compute Impact from before/after visible counts.
 *
 * Example: 5 → 1 → { deltaPct: -80, labelKo: "-80% · 후보 감소" }
 */
export function computeDraftImpact(
  beforeVisibleCount: number,
  afterVisibleCount: number,
  extras?: Readonly<Record<string, unknown>>,
): DraftImpact {
  const before = Math.max(0, Math.floor(beforeVisibleCount));
  const after = Math.max(0, Math.floor(afterVisibleCount));
  const removed = Math.max(0, before - after);

  let deltaPct: number | null = null;
  if (before > 0) {
    deltaPct = Math.round(((after - before) / before) * 100);
  } else if (after === 0) {
    deltaPct = 0;
  }

  const pctLabelKo =
    deltaPct == null ? "—" : deltaPct > 0 ? `+${deltaPct}%` : `${deltaPct}%`;

  const effectLabelKo =
    deltaPct != null && deltaPct < 0
      ? "후보 감소"
      : deltaPct != null && deltaPct > 0
        ? "후보 증가"
        : "변화 없음";

  const labelKo =
    deltaPct != null && deltaPct !== 0
      ? `${pctLabelKo} · ${effectLabelKo}`
      : effectLabelKo;

  const summaryKo =
    deltaPct != null && deltaPct < 0
      ? `후보 ${Math.abs(deltaPct)}% 감소 · ${before}→${after}`
      : deltaPct != null && deltaPct > 0
        ? `후보 ${deltaPct}% 증가 · ${before}→${after}`
        : `표시 ${before}→${after}`;

  return {
    deltaPct,
    beforeVisibleCount: before,
    afterVisibleCount: after,
    candidatesRemoved: removed,
    pctLabelKo,
    effectLabelKo,
    labelKo,
    summaryKo,
    details: {
      delta: after - before,
      ...(extras ?? {}),
    },
  };
}

/** UX line: Impact · -80% · 후보 감소 */
export function formatImpactUxKo(impact: DraftImpact): string {
  return `Impact\n${impact.pctLabelKo}\n${impact.effectLabelKo}`;
}
