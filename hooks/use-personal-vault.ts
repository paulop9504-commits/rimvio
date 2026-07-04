"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { isVaultUnavailableStatus } from "@/lib/vault/vault-api-errors";
import type { VaultObjectSummary } from "@/lib/vault/types";

export type PersonalVaultState = {
  ready: boolean;
  loading: boolean;
  persisted: boolean;
  vaultAvailable: boolean;
  vault: {
    userId: string;
    status: string;
    storageQuotaBytes: number;
    storageUsedBytes: number;
    cryptoScheme: string;
  } | null;
  objects: VaultObjectSummary[];
  error: string | null;
  ensure: () => Promise<boolean>;
  refresh: () => Promise<void>;
};

/** Client hook — ensure encrypted personal vault after login. */
export function usePersonalVault(enabled = true): PersonalVaultState {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [persisted, setPersisted] = useState(false);
  const [vaultAvailable, setVaultAvailable] = useState(true);

  useEffect(() => {
    setVaultAvailable(true);
  }, [user?.id]);
  const [vault, setVault] = useState<PersonalVaultState["vault"]>(null);
  const [objects, setObjects] = useState<VaultObjectSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || !user?.id) {
      setPersisted(false);
      setVault(null);
      setObjects([]);
      setError(null);
      setVaultAvailable(true);
      return;
    }

    if (!vaultAvailable) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/vault", { credentials: "include" });
      const data = (await response.json()) as {
        persisted?: boolean;
        vault?: PersonalVaultState["vault"];
        objects?: VaultObjectSummary[];
        error?: string;
        hint?: string;
      };
      if (response.status === 401) {
        setPersisted(false);
        setVault(null);
        setObjects([]);
        setError(null);
        return;
      }
      if (isVaultUnavailableStatus(response.status, data.hint, data.error)) {
        setPersisted(false);
        setVault(null);
        setObjects([]);
        setError(null);
        setVaultAvailable(false);
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
  }, [enabled, user?.id, vaultAvailable]);

  const ensure = useCallback(async (): Promise<boolean> => {
    if (!enabled || !user?.id || !vaultAvailable) {
      return false;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/vault", {
        method: "POST",
        credentials: "include",
      });
      const data = (await response.json()) as { error?: string; hint?: string };
      if (isVaultUnavailableStatus(response.status, data.hint, data.error)) {
        setVaultAvailable(false);
        return false;
      }
      if (!response.ok) {
        throw new Error(data.error ?? "vault_ensure_failed");
      }
      await refresh();
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "vault_ensure_failed");
      return false;
    } finally {
      setLoading(false);
    }
  }, [enabled, refresh, user?.id, vaultAvailable]);

  useEffect(() => {
    if (!enabled || !user?.id || !vaultAvailable) {
      return;
    }
    void refresh();
  }, [enabled, refresh, user?.id, vaultAvailable]);

  useEffect(() => {
    if (!enabled || !user?.id || !vaultAvailable) {
      return;
    }
    if (vault) {
      return;
    }
    void ensure();
  }, [enabled, ensure, user?.id, vault, vaultAvailable]);

  return {
    ready: Boolean(user?.id && vault),
    loading,
    persisted,
    vaultAvailable,
    vault,
    objects,
    error,
    ensure,
    refresh,
  };
}
