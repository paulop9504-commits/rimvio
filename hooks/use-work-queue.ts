"use client";

import { useEffect, useState } from "react";
import {
  listWorkQueueItems,
  subscribeWorkQueueUpdated,
  syncWorkQueueFromActiveRuns,
} from "@/lib/work-queue";
import type { WorkQueueItem } from "@/lib/work-queue";

export function useWorkQueue() {
  const [items, setItems] = useState<WorkQueueItem[]>(() => {
    syncWorkQueueFromActiveRuns();
    return listWorkQueueItems();
  });

  useEffect(() => {
    const refresh = () => {
      syncWorkQueueFromActiveRuns();
      setItems(listWorkQueueItems());
    };
    refresh();
    return subscribeWorkQueueUpdated(refresh);
  }, []);

  return { items, count: items.length, refresh: () => {
    syncWorkQueueFromActiveRuns();
    setItems(listWorkQueueItems());
  } };
}
