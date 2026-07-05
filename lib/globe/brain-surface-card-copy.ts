export function normalizeBrainCardText(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/gu, " ") ?? "";
}

function normalizeBrainCardKey(value: string | null | undefined): string {
  return normalizeBrainCardText(value).toLowerCase();
}

export function compactBrainCardTitle(title: string, maxLength = 42): string {
  const trimmed = normalizeBrainCardText(title);
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}

export function textsOverlap(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  const a = normalizeBrainCardKey(left);
  const b = normalizeBrainCardKey(right);
  if (!a || !b) {
    return false;
  }
  if (a === b) {
    return true;
  }
  if (a.length >= 10 && b.includes(a)) {
    return true;
  }
  if (b.length >= 10 && a.includes(b)) {
    return true;
  }
  return false;
}

export function stripWrappedGuideTitle(
  text: string | null | undefined,
  guideTitle: string | null | undefined,
): string | null {
  const raw = normalizeBrainCardText(text);
  if (!raw) {
    return null;
  }
  const title = normalizeBrainCardText(guideTitle);
  if (/맥락에 맞춰 찾은/u.test(raw) && (!title || raw.includes(title))) {
    return null;
  }
  if (/감을 빠르게 잡기 좋은 영상/u.test(raw)) {
    return null;
  }
  if (/맥락 옆에 붙여 둘 공개 참고/u.test(raw)) {
    return null;
  }
  if (title && textsOverlap(raw, title)) {
    return null;
  }
  return raw;
}

export function splitRelationReason(
  relationReason: string | null | undefined,
  guideTitle: string | null | undefined,
): string | null {
  const raw = normalizeBrainCardText(relationReason);
  if (!raw) {
    return null;
  }
  const title = normalizeBrainCardText(guideTitle);
  if (title) {
    const parts = raw.split(" · ");
    if (parts.length > 1 && textsOverlap(parts[0], title)) {
      return normalizeBrainCardText(parts.slice(1).join(" · ")) || null;
    }
    if (raw.startsWith(title)) {
      return normalizeBrainCardText(raw.slice(title.length).replace(/^[·\-\s]+/, "")) || null;
    }
    if (textsOverlap(raw, title)) {
      return null;
    }
  }
  return raw;
}

export function pickCardHeadline(input: {
  nodeLabel: string;
  guideTitle: string | null | undefined;
  isMediaInferredGhost: boolean;
}): { headline: string; guideTitleLine: string | null } {
  const nodeLabel = normalizeBrainCardText(input.nodeLabel);
  const guideTitle = normalizeBrainCardText(input.guideTitle);
  if (
    input.isMediaInferredGhost &&
    nodeLabel &&
    guideTitle &&
    !textsOverlap(nodeLabel, guideTitle)
  ) {
    return {
      headline: nodeLabel,
      guideTitleLine: compactBrainCardTitle(guideTitle),
    };
  }
  return {
    headline: guideTitle || nodeLabel,
    guideTitleLine: null,
  };
}

export function pickPrimaryReason(input: {
  headline: string;
  guideTitle?: string | null;
  whyRelevantKo?: string | null;
  relationReasonKo?: string | null;
  playbookReasonKo?: string | null;
  snippetKo?: string | null;
  memoBody?: string | null;
}): string | null {
  const guideTitle = normalizeBrainCardText(input.guideTitle);
  const candidates = [
    splitRelationReason(input.relationReasonKo, guideTitle || input.headline),
    normalizeBrainCardText(input.playbookReasonKo),
    stripWrappedGuideTitle(input.whyRelevantKo, guideTitle || input.headline),
    normalizeBrainCardText(input.snippetKo),
    normalizeBrainCardText(input.memoBody),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (
      !textsOverlap(candidate, input.headline) &&
      !textsOverlap(candidate, guideTitle)
    ) {
      return candidate;
    }
  }
  return null;
}

export function dedupeFactorChips(
  factors: readonly string[],
  blocked: readonly string[],
  max = 3,
): string[] {
  const blockedKeys = new Set(
    blocked.map((value) => normalizeBrainCardKey(value)).filter(Boolean),
  );
  const output: string[] = [];

  for (const factor of factors) {
    const raw = normalizeBrainCardText(factor);
    if (!raw) {
      continue;
    }
    if (/에서 뽑음$/u.test(raw)) {
      continue;
    }
    const basisPrefix = raw.endsWith(" 기준") ? raw.slice(0, -" 기준".length) : null;
    if (
      basisPrefix &&
      blocked.some(
        (value) =>
          textsOverlap(value, basisPrefix) ||
          normalizeBrainCardKey(value) === normalizeBrainCardKey(basisPrefix),
      )
    ) {
      continue;
    }
    const key = normalizeBrainCardKey(raw);
    if (blockedKeys.has(key)) {
      continue;
    }
    if (output.some((existing) => textsOverlap(existing, raw))) {
      continue;
    }
    if (blocked.some((value) => textsOverlap(value, raw))) {
      continue;
    }
    output.push(raw);
    blockedKeys.add(key);
    if (output.length >= max) {
      break;
    }
  }

  return output;
}

export function shouldShowContextBadge(
  contextTitle: string,
  categoryLabel: string | null | undefined,
): boolean {
  const context = normalizeBrainCardText(contextTitle);
  const category = normalizeBrainCardText(categoryLabel);
  if (!context) {
    return false;
  }
  return !textsOverlap(context, category);
}

export function shouldShowCandidateBadge(
  badge: string | null | undefined,
  categoryLabel: string | null | undefined,
): boolean {
  const raw = normalizeBrainCardText(badge);
  const category = normalizeBrainCardText(categoryLabel);
  if (!raw) {
    return false;
  }
  if (/미디어 후보/u.test(raw) && /미디어|후보/u.test(category)) {
    return false;
  }
  return !textsOverlap(raw, category);
}
