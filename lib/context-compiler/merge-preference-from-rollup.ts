/**
 * Preference Parser — archive learning rollup → CompilerPreferenceVector (ADR-023 §4).
 * Same utterance can diverge per person via Action OS rollup affinities.
 */

import { listLearningRollup } from "@/lib/archive/learning-rollup-store";
import type { LearningRollupEntry } from "@/lib/archive/learning-rollup-store";
import type { CompilerPreferenceVector } from "@/lib/context-compiler/types";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Math.round(value * 1000) / 1000));
}

function blend(base: number, signal: number, weight: number): number {
  if (weight <= 0) {
    return base;
  }
  const w = Math.min(0.55, weight);
  return clamp01(base * (1 - w) + signal * w);
}

type DimKey = keyof CompilerPreferenceVector;

function dimsFromHay(hay: string): Partial<Record<DimKey, number>> {
  const out: Partial<Record<DimKey, number>> = {};
  if (/eatery|restaurant|food|cafe|맛집|카페|먹|식사|meal/i.test(hay)) {
    out.food = 0.9;
  }
  if (/nature|park|한강|바다|산|캠핑|산책|outdoor/i.test(hay)) {
    out.nature = 0.85;
  }
  if (/luxury|5성|고급|premium|스위트|suite/i.test(hay)) {
    out.luxury = 0.88;
  }
  if (/budget|cheap|가성비|저렴|싸|economy|hostel/i.test(hay)) {
    out.budgetSensitive = 0.9;
  }
  if (/quiet|crowd|한적|한산|조용|웨이팅|no[_-]?wait/i.test(hay)) {
    out.crowdAvoidance = 0.88;
  }
  if (/date|romantic|데이트|로맨틱|커플|분위기/i.test(hay)) {
    out.romantic = 0.9;
  }
  if (/lodging|hotel|숙소|호텔|stay/i.test(hay) && !out.luxury && !out.budgetSensitive) {
    out.luxury = 0.55;
  }
  return out;
}

/**
 * Merge utterance-base preference with archive rollup affinities.
 * High execute/scoreDelta actions pull matching preference dims.
 */
export function mergePreferenceFromArchiveRollup(
  base: CompilerPreferenceVector,
  entries: readonly LearningRollupEntry[] = listLearningRollup(),
): CompilerPreferenceVector {
  if (entries.length === 0) {
    return base;
  }

  const ranked = [...entries]
    .filter((e) => e.scoreDelta > 0.05 || e.executed > 0)
    .sort((a, b) => b.scoreDelta - a.scoreDelta)
    .slice(0, 12);

  let next = { ...base };
  for (const entry of ranked) {
    const hay = `${entry.contextKey} ${entry.actionKey} ${entry.label}`;
    const dims = dimsFromHay(hay);
    const weight = clamp01(
      entry.scoreDelta * 0.85 + (entry.executed > 0 ? 0.15 : 0),
    );
    for (const [key, signal] of Object.entries(dims) as Array<
      [DimKey, number]
    >) {
      next = {
        ...next,
        [key]: blend(next[key], signal, weight),
      };
    }
  }
  return next;
}
