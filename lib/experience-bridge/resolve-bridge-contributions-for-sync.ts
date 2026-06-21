import type { ExperienceBridgeContribution } from "@/lib/experience-bridge/experience-bridge-types";

function contributionKey(row: ExperienceBridgeContribution): string | null {
  const captureId = row.capture?.id?.trim();
  const contributor = row.contributorUserId?.trim();
  if (!captureId || !contributor) {
    return null;
  }
  return `${contributor}:${captureId}`;
}

/** Merge plan + dedicated GET — never drop rows from either source. */
export function resolveBridgeContributionsForSync(input: {
  fromPlan: readonly ExperienceBridgeContribution[];
  fromDedicated?: readonly ExperienceBridgeContribution[] | null;
}): ExperienceBridgeContribution[] {
  const out = new Map<string, ExperienceBridgeContribution>();

  for (const row of [...input.fromPlan, ...(input.fromDedicated ?? [])]) {
    const key = contributionKey(row);
    if (!key) {
      continue;
    }
    const existing = out.get(key);
    if (!existing) {
      out.set(key, row);
      continue;
    }
    const existingUrl = existing.capture?.url?.trim();
    const nextUrl = row.capture?.url?.trim();
    if (!existingUrl && nextUrl) {
      out.set(key, row);
    }
  }

  return [...out.values()];
}
