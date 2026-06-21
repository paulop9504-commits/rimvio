"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { VaultObjectSummary } from "@/lib/vault/types";

export type PersonalVaultState = {
  ready: boolean;
  loading: boolean;
  persisted: boolean;
  vault: {
    userId: string;
    status: string;
    storageQuotaBytes: number;
    storageUsedBytes: number;
    cryptoScheme: string;
  } | null;
  objects: VaultObjectSummary[];
  error: string | null;
  ensure: () => Promise<void>;
  refresh: () => Promise<void>;
};

/** Client hook — ensure encrypted personal vault after login. */
export function usePersonalVault(enabled = true): PersonalVaultState {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [persisted, setPersisted] = useState(false);
  const [vault, setVault] = useState<PersonalVaultState["vault"]>(null);
  const [objects, setObjects] = useState<VaultObjectSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [migrationRequired, setMigrationRequired] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled || !user?.id) {
      setPersisted(false);
      setVault(null);
      setObjects([]);
      setError(null);
      setMigrationRequired(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/vault", { credentials: "include" });
      if (response.status === 401) {
        setPersisted(false);
        setVault(null);
        setObjects([]);
        setError(null);
        setMigrationRequired(false);
        return;
      }
      const data = (await response.json()) as {
        persisted?: boolean;
        vault?: PersonalVaultState["vault"];
        objects?: VaultObjectSummary[];
        error?: string;
        hint?: string;
      };
      if (response.status === 503 && data.hint === "vault_migration_required") {
        setPersisted(false);
        setVault(null);
        setObjects([]);
        setError(null);
        setMigrationRequired(true);
        return;
      }
      if (!response.ok) {
        throw new Error(data.error ?? "vault_fetch_failed");
      }
      setPersisted(Boolean(data.persisted));
      setVault(data.vault ?? null);
      setObjects(data.objects ?? []);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "vault_fetch_failed");
    } finally {
      setLoading(false);
    }
  }, [enabled, user?.id]);

  const ensure = useCallback(async () => {
    if (!enabled || !user?.id || migrationRequired) {
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/vault", {
        method: "POST",
        credentials: "include",
      });
      const data = (await response.json()) as { error?: string; hint?: string };
      if (response.status === 503 && data.hint === "vault_migration_required") {
        setMigrationRequired(true);
        return;
      }
      if (!response.ok) {
        throw new Error(data.error ?? "vault_ensure_failed");
      }
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "vault_ensure_failed");
    } finally {
      setLoading(false);
    }
  }, [enabled, refresh, user?.id, migrationRequired]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled || !user?.id || migrationRequired) {
      return;
    }
    void ensure();
  }, [enabled, ensure, migrationRequired, user?.id]);

  return {
    ready: Boolean(user?.id && vault),
    loading,
    persisted,
    vault,
    objects,
    error,
    ensure,
    refresh,
  };
}
