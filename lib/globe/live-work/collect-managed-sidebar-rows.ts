import {
  listInProgressLiveWorks,
  listRecentCompletedLiveWorks,
} from "@/lib/globe/live-work/live-work-store";
import type { LiveWork } from "@/lib/globe/live-work/types";

export function collectManagedLiveWorks(nowMs: number = Date.now()): {
  inProgress: LiveWork[];
  recentlySettled: LiveWork[];
  occupiedIds: Set<string>;
} {
  const inProgress = listInProgressLiveWorks();
  const recentlySettled = listRecentCompletedLiveWorks(nowMs);
  const occupiedIds = new Set(
    [...inProgress, ...recentlySettled].map((row) => row.contextEventId),
  );
  return { inProgress, recentlySettled, occupiedIds };
}
