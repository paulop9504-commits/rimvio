"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePersonalVault } from "@/hooks/use-personal-vault";
import { flushVaultSyncQueue } from "@/lib/materialize/flush-vault-sync-client";
import { MATERIALIZE_UPDATED } from "@/lib/materialize/materialize-db";

const FLUSH_INTERVAL_MS = 45_000;

/** Ensure vault + drain device materialization sync queue when online. */
export function useMaterializeVaultSync(enabled = true): void {
  const { user } = useAuth();
  const { ensure, refresh, vaultAvailable } = usePersonalVault(enabled && Boolean(user?.id));
  const flushingRef = useRef(false);

  const flush = useCallback(async () => {
    if (!enabled || !user?.id || flushingRef.current || !vaultAvailable) {
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return;
    }

    flushingRef.current = true;
    try {
      const ok = await ensure();
      if (!ok) {
        return;
      }
      await flushVaultSyncQueue({ limit: 6 });
      await refresh();
    } catch {
      /* retry on interval or MATERIALIZE_UPDATED */
    } finally {
      flushingRef.current = false;
    }
  }, [enabled, ensure, refresh, user?.id, vaultAvailable]);

  useEffect(() => {
    if (!enabled || !user?.id || !vaultAvailable) {
      return;
    }
    void flush();
    const timer = window.setInterval(() => {
      void flush();
    }, FLUSH_INTERVAL_MS);
    const onOnline = () => {
      void flush();
    };
    const onMaterialize = () => {
      void flush();
    };
    window.addEventListener("online", onOnline);
    window.addEventListener(MATERIALIZE_UPDATED, onMaterialize);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", onOnline);
      window.removeEventListener(MATERIALIZE_UPDATED, onMaterialize);
    };
  }, [enabled, flush, user?.id, vaultAvailable]);
}
