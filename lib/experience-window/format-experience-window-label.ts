import type { ExperiencePhase, ExperienceWindow } from "@/lib/experience-window/experience-window-types";
import { formatPinDateLabel } from "@/lib/globe/format-pin-date-label";

export function formatExperiencePhaseLabel(phase: ExperiencePhase): string {
  switch (phase) {
    case "prep":
      return "준비";
    case "live":
      return "여행 중";
    case "recall":
      return "그때 거기";
    default:
      return "";
  }
}

export function formatExperienceTripTimingLabel(
  timing: ExperienceWindow["tripTiming"],
): string {
  switch (timing) {
    case "future":
      return "다가오는 여행";
    case "present":
      return "지금";
    case "past":
      return "지난 여행";
    default:
      return "";
  }
}

export function formatExperienceWindowRangeLabel(window: ExperienceWindow): string | null {
  const start = formatPinDateLabel(window.windowStartIso);
  const end = formatPinDateLabel(window.windowEndIso);
  if (start && end && start !== end) {
    return `${start} – ${end}`;
  }
  return start ?? end;
}

export function formatTimelineOccurredLabel(iso: string): string {
  const date = formatPinDateLabel(iso);
  if (!date) {
    return "";
  }
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    return date;
  }
  const d = new Date(ms);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${date} ${hours}:${minutes}`;
}
