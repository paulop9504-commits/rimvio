/** Schedule domain — organize → remind → calendar → todo. */
export const SCHEDULE_ACTION_SEQUENCE = [
  "schedule",
  "reminder",
  "calendar",
  "todo",
] as const;

export type SchedulePlaybookFeatureId = (typeof SCHEDULE_ACTION_SEQUENCE)[number];

export const SCHEDULE_ACTION_LABELS: Record<SchedulePlaybookFeatureId, string> = {
  schedule: "일정정리",
  reminder: "알림",
  calendar: "캘린더",
  todo: "할일",
};
