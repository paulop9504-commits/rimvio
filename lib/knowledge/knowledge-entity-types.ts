export type KnowledgeContainerId = "calendar" | "data";

export type KnowledgeEntityType = "phone" | "text" | "contact" | "note" | "schedule";

export type KnowledgeEntity = {
  id: string;
  containerId: KnowledgeContainerId;
  type: KnowledgeEntityType;
  label: string;
  value: string;
  searchText: string;
  sourceMessage?: string;
  /** Resource pool reference — passive link bookmark */
  sourceLinkId?: string;
  /** Action stream trigger — only set when promoted to schedule */
  scheduledAt?: string;
  createdAt: string;
};

export const FIXED_CALENDAR_CONTAINER_ID = "calendar" as const;
export const FIXED_DATA_CONTAINER_ID = "data" as const;
