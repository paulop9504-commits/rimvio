import type { LinkReminder } from "@/lib/local-links/reminders";

export type DayScheduleTask = {
  time: string;
  task: string;
};

export type ExistingScheduleInput = DayScheduleTask[];

function padTime(hour: number, minute: number) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function formatDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function remindersToDaySchedule(
  reminders: LinkReminder[],
  dateKey = formatDateKey()
): ExistingScheduleInput {
  return reminders
    .filter((item) => item.fireAt.slice(0, 10) === dateKey)
    .map((item) => {
      const at = new Date(item.fireAt);
      return {
        time: padTime(at.getHours(), at.getMinutes()),
        task: item.title,
      };
    })
    .sort((a, b) => a.time.localeCompare(b.time));
}

function parseTimeMinutes(time: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) {
    return null;
  }
  return Number.parseInt(match[1]!, 10) * 60 + Number.parseInt(match[2]!, 10);
}

export function detectScheduleConflict(input: {
  proposed: DayScheduleTask[];
  existing: ExistingScheduleInput;
  bufferMinutes?: number;
}): { isConflict: boolean; overlaps: Array<{ proposed: DayScheduleTask; existing: DayScheduleTask }> } {
  const buffer = input.bufferMinutes ?? 30;
  const overlaps: Array<{ proposed: DayScheduleTask; existing: DayScheduleTask }> = [];

  for (const next of input.proposed) {
    const nextMin = parseTimeMinutes(next.time);
    if (nextMin == null) {
      continue;
    }

    for (const current of input.existing) {
      const currentMin = parseTimeMinutes(current.time);
      if (currentMin == null) {
        continue;
      }

      if (Math.abs(nextMin - currentMin) < buffer) {
        overlaps.push({ proposed: next, existing: current });
      }
    }
  }

  return { isConflict: overlaps.length > 0, overlaps };
}

export function parseScheduleTasksFromMessage(message: string): DayScheduleTask[] {
  const tasks: DayScheduleTask[] = [];
  const timePatterns = message.matchAll(/(\d{1,2}:\d{2})/g);

  for (const match of timePatterns) {
    const time = match[1]!;
    const snippet = message.slice(Math.max(0, match.index! - 12), match.index! + 24);
    const task =
      snippet
        .replace(time, "")
        .replace(/[·\-—,]/g, " ")
        .trim()
        .slice(0, 40) || "일정";

    tasks.push({ time: time.length === 4 ? `0${time}` : time, task });
  }

  return tasks;
}
