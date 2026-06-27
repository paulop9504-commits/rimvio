import { frameDiffIsEmpty } from "@/lib/cognitive-streaming-cycle/frame-diff";
import type { FrameDiff } from "@/lib/cognitive-streaming-cycle/types";
import type {
  CalendarUiItem,
  DockUiItem,
  NarrationUiItem,
  SurfaceUiState,
  TimelineUiItem,
} from "@/lib/surface-render-contract/types";
import {
  SURFACE_KEYS,
  type SurfaceKey,
} from "@/lib/react-atomic-frame-binder/types";

function cloneCalendarItem(item: CalendarUiItem): CalendarUiItem {
  return { ...item };
}

function cloneDockItem(item: DockUiItem): DockUiItem {
  return { ...item };
}

function cloneTimelineItem(item: TimelineUiItem): TimelineUiItem {
  return { ...item };
}

function cloneNarrationItem(item: NarrationUiItem): NarrationUiItem {
  return { ...item };
}

export function cloneSurfaceUiState(uiState: SurfaceUiState): SurfaceUiState {
  return {
    CALENDAR: uiState.CALENDAR.map(cloneCalendarItem),
    DOCK: uiState.DOCK.map(cloneDockItem),
    TIMELINE: uiState.TIMELINE.map(cloneTimelineItem),
    NARRATION: uiState.NARRATION.map(cloneNarrationItem),
  };
}

function cloneSurfaceItem(surface: SurfaceKey, item: SurfaceUiState[SurfaceKey][number]) {
  switch (surface) {
    case "CALENDAR":
      return cloneCalendarItem(item as CalendarUiItem);
    case "DOCK":
      return cloneDockItem(item as DockUiItem);
    case "TIMELINE":
      return cloneTimelineItem(item as TimelineUiItem);
    case "NARRATION":
      return cloneNarrationItem(item as NarrationUiItem);
  }
}

function findItemInTarget(target: SurfaceUiState, id: string): { surface: SurfaceKey; item: SurfaceUiState[SurfaceKey][number] } | null {
  for (const surface of SURFACE_KEYS) {
    const item = target[surface].find((entry) => entry.id === id);
    if (item) {
      return { surface, item };
    }
  }
  return null;
}

function removeIdsFromSurface<T extends { id: string }>(items: readonly T[], ids: ReadonlySet<string>): T[] {
  return items.filter((item) => !ids.has(item.id)).map((item) => ({ ...item }));
}

/** Apply frameDiff to previous uiState using target values — no full replacement. */
export function applyFrameDiff(
  previous: SurfaceUiState,
  target: SurfaceUiState,
  diff: FrameDiff
): SurfaceUiState {
  const removed = new Set(diff.removed);
  const changed = new Set([...diff.added, ...diff.updated]);

  if (removed.size === 0 && changed.size === 0) {
    return cloneSurfaceUiState(previous);
  }

  const next = cloneSurfaceUiState(previous);

  for (const surface of SURFACE_KEYS) {
    switch (surface) {
      case "CALENDAR":
        next.CALENDAR = removeIdsFromSurface(next.CALENDAR, removed);
        next.CALENDAR = removeIdsFromSurface(next.CALENDAR, changed);
        break;
      case "DOCK":
        next.DOCK = removeIdsFromSurface(next.DOCK, removed);
        next.DOCK = removeIdsFromSurface(next.DOCK, changed);
        break;
      case "TIMELINE":
        next.TIMELINE = removeIdsFromSurface(next.TIMELINE, removed);
        next.TIMELINE = removeIdsFromSurface(next.TIMELINE, changed);
        break;
      case "NARRATION":
        next.NARRATION = removeIdsFromSurface(next.NARRATION, removed);
        next.NARRATION = removeIdsFromSurface(next.NARRATION, changed);
        break;
    }
  }

  for (const id of changed) {
    const located = findItemInTarget(target, id);
    if (!located) {
      continue;
    }

    const cloned = cloneSurfaceItem(located.surface, located.item);
    const surfaceItems = next[located.surface] as Array<typeof cloned>;

    const targetSurfaceItems = target[located.surface];
    const targetIndex = targetSurfaceItems.findIndex((entry) => entry.id === id);
    const insertAt = Math.min(Math.max(targetIndex, 0), surfaceItems.length);
    surfaceItems.splice(insertAt, 0, cloned);
    switch (located.surface) {
      case "CALENDAR":
        next.CALENDAR = surfaceItems as CalendarUiItem[];
        break;
      case "DOCK":
        next.DOCK = surfaceItems as DockUiItem[];
        break;
      case "TIMELINE":
        next.TIMELINE = surfaceItems as TimelineUiItem[];
        break;
      case "NARRATION":
        next.NARRATION = surfaceItems as NarrationUiItem[];
        break;
    }
  }

  for (const surface of SURFACE_KEYS) {
    switch (surface) {
      case "CALENDAR": {
        const ordered: CalendarUiItem[] = [];
        const seen = new Set<string>();
        for (const targetItem of target.CALENDAR) {
          if (removed.has(targetItem.id)) continue;
          const existing = next.CALENDAR.find((entry) => entry.id === targetItem.id);
          if (existing && !seen.has(existing.id)) {
            ordered.push(cloneCalendarItem(existing));
            seen.add(existing.id);
          }
        }
        for (const item of next.CALENDAR) {
          if (!seen.has(item.id)) {
            ordered.push(cloneCalendarItem(item));
            seen.add(item.id);
          }
        }
        next.CALENDAR = ordered;
        break;
      }
      case "DOCK": {
        const ordered: DockUiItem[] = [];
        const seen = new Set<string>();
        for (const targetItem of target.DOCK) {
          if (removed.has(targetItem.id)) continue;
          const existing = next.DOCK.find((entry) => entry.id === targetItem.id);
          if (existing && !seen.has(existing.id)) {
            ordered.push(cloneDockItem(existing));
            seen.add(existing.id);
          }
        }
        for (const item of next.DOCK) {
          if (!seen.has(item.id)) {
            ordered.push(cloneDockItem(item));
            seen.add(item.id);
          }
        }
        next.DOCK = ordered;
        break;
      }
      case "TIMELINE": {
        const ordered: TimelineUiItem[] = [];
        const seen = new Set<string>();
        for (const targetItem of target.TIMELINE) {
          if (removed.has(targetItem.id)) continue;
          const existing = next.TIMELINE.find((entry) => entry.id === targetItem.id);
          if (existing && !seen.has(existing.id)) {
            ordered.push(cloneTimelineItem(existing));
            seen.add(existing.id);
          }
        }
        for (const item of next.TIMELINE) {
          if (!seen.has(item.id)) {
            ordered.push(cloneTimelineItem(item));
            seen.add(item.id);
          }
        }
        next.TIMELINE = ordered;
        break;
      }
      case "NARRATION": {
        const ordered: NarrationUiItem[] = [];
        const seen = new Set<string>();
        for (const targetItem of target.NARRATION) {
          if (removed.has(targetItem.id)) continue;
          const existing = next.NARRATION.find((entry) => entry.id === targetItem.id);
          if (existing && !seen.has(existing.id)) {
            ordered.push(cloneNarrationItem(existing));
            seen.add(existing.id);
          }
        }
        for (const item of next.NARRATION) {
          if (!seen.has(item.id)) {
            ordered.push(cloneNarrationItem(item));
            seen.add(item.id);
          }
        }
        next.NARRATION = ordered;
        break;
      }
    }
  }

  return next;
}

export function shouldApplyFrame(frame: { uiCommit: boolean; frameDiff: FrameDiff }): boolean {
  if (!frame.uiCommit) {
    return false;
  }
  if (frameDiffIsEmpty(frame.frameDiff)) {
    return false;
  }
  return true;
}
