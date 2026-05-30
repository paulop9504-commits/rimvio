import { saveKnowledgeEntity, getRecentKnowledgeEntities } from "@/lib/knowledge/knowledge-entity-db";
import {
  FIXED_CALENDAR_CONTAINER_ID,
  FIXED_DATA_CONTAINER_ID,
} from "@/lib/knowledge/knowledge-entity-types";
import {
  clearReminderByLinkId,
  requestReminderPermission,
  scheduleLinkReminderAt,
} from "@/lib/local-links/reminders";
import type { LinkRow } from "@/types/database";

/** Passive — bookmark link into Resource Pool (no alarm). */
export async function saveLinkToResourcePool(link: LinkRow) {
  const existing = await getRecentKnowledgeEntities({
    containerId: FIXED_DATA_CONTAINER_ID,
    limit: 100,
  });
  const prior = existing.find(
    (entity) => entity.sourceLinkId === link.id && !entity.scheduledAt
  );
  if (prior) {
    return prior;
  }

  return saveKnowledgeEntity({
    containerId: FIXED_DATA_CONTAINER_ID,
    type: "note",
    label: link.title?.trim() || "저장한 링크",
    value: link.original_url,
    sourceLinkId: link.id,
    sourceMessage: link.domain,
  });
}

/** Active — promote link from pool to Action Stream with trigger time. */
export async function promoteLinkToActionStream(link: LinkRow, fireAtIso: string) {
  const fireAt = new Date(fireAtIso);
  if (Number.isNaN(fireAt.getTime())) {
    throw new Error("invalid_fire_at");
  }
  if (fireAt.getTime() <= Date.now() + 30_000) {
    throw new Error("fire_at_past");
  }

  await requestReminderPermission();

  scheduleLinkReminderAt({
    linkId: link.id,
    title: link.title,
    url: link.original_url,
    fireAt: fireAtIso,
  });

  await saveKnowledgeEntity({
    containerId: FIXED_CALENDAR_CONTAINER_ID,
    type: "schedule",
    label: link.title?.trim() || "예약된 링크",
    value: link.original_url,
    sourceLinkId: link.id,
    scheduledAt: fireAtIso,
    sourceMessage: fireAtIso,
  });
}

/** Demote — stop alarm, keep link in feed (passive again). */
export function demoteLinkFromActionStream(linkId: string) {
  clearReminderByLinkId(linkId);
}

export function buildFireAtFromDateTime(date: string, time: string) {
  const [hour, minute] = time.split(":");
  return `${date}T${hour?.padStart(2, "0") ?? "09"}:${minute ?? "00"}:00`;
}
