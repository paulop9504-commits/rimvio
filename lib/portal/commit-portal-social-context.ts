import type { PortalCategoryId } from "@/lib/portal/portal-types";
import type { PortalSocialSlotId } from "@/lib/portal/portal-social-slots";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";
import { findLifeEventCandidate } from "@/lib/life-read-model";

/** Stamp together/join portal Run on existing context event. */
export function commitPortalSocialContext(input: {
  eventId: string;
  title: string;
  intentId: "together" | "join";
  categoryId: PortalCategoryId | null;
  socialSlots: Partial<Record<PortalSocialSlotId, string>>;
}): void {
  const existing = findLifeEventCandidate(input.eventId);
  if (!existing) {
    return;
  }

  const place = input.socialSlots.place?.trim() || existing.place;
  commitEventUpsert({
    id: existing.id,
    title: input.title.trim() || existing.title,
    category: existing.category,
    source: existing.source,
    lifecycle: existing.lifecycle,
    datetime: existing.datetime,
    place: place ?? undefined,
    containerId: existing.containerId,
    confidence: existing.confidence,
    lifecycleUpdatedAt: existing.lifecycleUpdatedAt,
    metadata: {
      ...existing.metadata,
      sourceRef: `portal:${input.intentId}`,
      portalIntentId: input.intentId,
      portalCategoryId: input.categoryId,
      portalSocialSlots: input.socialSlots,
    },
  });
}
