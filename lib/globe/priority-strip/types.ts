import type { PersonaPendingLearn } from "@/lib/persona/types";
import type { WorkQueueItem } from "@/lib/work-queue";

export type PriorityStripKind =
  | "main_action"
  | "help_learn"
  | "protect"
  | "queue";

export type PriorityMainAction = {
  kind: "main_action";
  id: string;
  titleKo: string;
  subtitleKo: string | null;
  ctaLabelKo: string;
  actionKind: "show_qr" | "open_url" | "navigate" | "activate" | "internal_route" | "open_hub";
  href: string | null;
  qrSrc: string | null;
  eventId: string | null;
  resourceId: string | null;
  autoExpand: boolean;
};

export type PriorityLearnPayload = {
  kind: "help_learn" | "protect";
  id: string;
  titleKo: string;
  learn: PersonaPendingLearn;
  autoExpand: boolean;
};

export type PriorityQueuePayload = {
  kind: "queue";
  id: string;
  titleKo: string;
  subtitleKo: string | null;
  queueItem: WorkQueueItem;
  queueCount: number;
  autoExpand: boolean;
};

export type PriorityStripPayload =
  | PriorityMainAction
  | PriorityLearnPayload
  | PriorityQueuePayload;

export const PRIORITY_STRIP_KIND_RANK: Record<PriorityStripKind, number> = {
  protect: 0,
  main_action: 1,
  help_learn: 2,
  queue: 3,
};
