"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getRecentKnowledgeEntities,
  KNOWLEDGE_ENTITY_UPDATED,
} from "@/lib/knowledge/knowledge-entity-db";
import type { KnowledgeEntity } from "@/lib/knowledge/knowledge-entity-types";
import { FIXED_DATA_CONTAINER_ID } from "@/lib/knowledge/knowledge-entity-types";

export function useResourcePool(limit = 20) {
  const [items, setItems] = useState<KnowledgeEntity[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const entities = await getRecentKnowledgeEntities({
        containerId: FIXED_DATA_CONTAINER_ID,
        limit,
      });
      setItems(entities.filter((entity) => !entity.scheduledAt));
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void refresh();
    const onUpdate = () => void refresh();
    window.addEventListener(KNOWLEDGE_ENTITY_UPDATED, onUpdate);
    return () => window.removeEventListener(KNOWLEDGE_ENTITY_UPDATED, onUpdate);
  }, [refresh]);

  return { items, loading, refresh };
}
