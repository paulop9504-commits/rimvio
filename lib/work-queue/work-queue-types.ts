export type GlobeWorkSurface = "inner" | "outer";

export type WorkQueueItemKind =
  | "portal_compose"
  | "travel_context"
  | "personal_capture";

export type WorkQueueItemStatus =
  | "slot_collect"
  | "drafting"
  | "ready_media"
  | "ready_publish";

export type WorkQueueItem = {
  id: string;
  graphId: string;
  kind: WorkQueueItemKind;
  surface: GlobeWorkSurface;
  titleKo: string;
  subtitleKo: string;
  status: WorkQueueItemStatus;
  seedMessage: string;
  eventId?: string | null;
  needsMedia: boolean;
  createdAt: string;
  updatedAt: string;
};

export const WORK_QUEUE_UPDATED = "rimvio-work-queue-updated";
