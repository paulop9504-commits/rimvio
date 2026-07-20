"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

type VaultGetBody = {
  persisted?: boolean;
  vault?: PersonalVaultState["vault"];
  objects?: VaultObjectSummary[];
  error?: string;
  hint?: string;
};

/** Survives AuthGate remounts — once vault is down, stop hammering /api/vault. */
const vaultDownByUser = new Map<string, number>();
const VAULT_DOWN_TTL_MS = 5 * 60 * 1000;

function isVaultLatchedDown(userId: string): boolean {
  const until = vaultDownByUser.get(userId);
  if (until == null) {
    return false;
  }
  if (Date.now() > until) {
    vaultDownByUser.delete(userId);
    return false;
  }
  return true;
}

function latchVaultDown(userId: string): void {
  vaultDownByUser.set(userId, Date.now() + VAULT_DOWN_TTL_MS);
}

/** Client hook — ensure encrypted personal vault after login. */
export function usePersonalVault(enabled = true): PersonalVaultState {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [persisted, setPersisted] = useState(false);
  const [vaultAvailable, setVaultAvailable] = useState(true);
  const [vault, setVault] = useState<PersonalVaultState["vault"]>(null);
  const [objects, setObjects] = useState<VaultObjectSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const bootOnceRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    bootOnceRef.current = null;
    if (user?.id && isVaultLatchedDown(user.id)) {
      setVaultAvailable(false);
      return;
    }
    setVaultAvailable(true);
  }, [user?.id]);

  const applyUnavailable = useCallback(() => {
    if (user?.id) {
      latchVaultDown(user.id);
    }
    setPersisted(false);
    setVault(null);
    setObjects([]);
    setError(null);
    setVaultAvailable(false);
  }, [user?.id]);

  const refresh = useCallback(async () => {
    if (!enabled || !user?.id) {
      setPersisted(false);
      setVault(null);
      setObjects([]);
      setError(null);
      setVaultAvailable(true);
      return;
    }

    if (!vaultAvailable || inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setLoading(true);
    try {
      const response = await fetch("/api/vault", { credentials: "include" });
      const data = (await response.json()) as VaultGetBody;
      if (response.status === 401) {
        setPersisted(false);
        setVault(null);
        setObjects([]);
        setError(null);
        return;
      }
      if (isVaultUnavailableStatus(response.status, data.hint, data.error)) {
        applyUnavailable();
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
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [applyUnavailable, enabled, user?.id, vaultAvailable]);

  const ensure = useCallback(async (): Promise<boolean> => {
    if (!enabled || !user?.id || !vaultAvailable || inFlightRef.current) {
      return false;
    }
    inFlightRef.current = true;
    setLoading(true);
    try {
      const response = await fetch("/api/vault", {
        method: "POST",
        credentials: "include",
      });
      const data = (await response.json()) as { error?: string; hint?: string };
      if (isVaultUnavailableStatus(response.status, data.hint, data.error)) {
        applyUnavailable();
        return false;
      }
      if (!response.ok) {
        throw new Error(data.error ?? "vault_ensure_failed");
      }
      inFlightRef.current = false;
      await refresh();
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "vault_ensure_failed");
      return false;
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [applyUnavailable, enabled, refresh, user?.id, vaultAvailable]);

  // One boot sequence per user — GET, then POST only if empty (no dual storm).
  useEffect(() => {
    if (!enabled || !user?.id || !vaultAvailable) {
      return;
    }
    if (bootOnceRef.current === user.id) {
      return;
    }
    bootOnceRef.current = user.id;

    let cancelled = false;
    void (async () => {
      if (inFlightRef.current) {
        return;
      }
      inFlightRef.current = true;
      setLoading(true);
      try {
        const getResponse = await fetch("/api/vault", { credentials: "include" });
        const getData = (await getResponse.json()) as VaultGetBody;
        if (cancelled) {
          return;
        }
        if (getResponse.status === 401) {
          setPersisted(false);
          setVault(null);
          setObjects([]);
          return;
        }
        if (isVaultUnavailableStatus(getResponse.status, getData.hint, getData.error)) {
          applyUnavailable();
          return;
        }
        if (!getResponse.ok) {
          setError(getData.error ?? "vault_fetch_failed");
          return;
        }
        if (getData.vault) {
          setPersisted(Boolean(getData.persisted));
          setVault(getData.vault);
          setObjects(getData.objects ?? []);
          setError(null);
          return;
        }

        const postResponse = await fetch("/api/vault", {
          method: "POST",
          credentials: "include",
        });
        const postData = (await postResponse.json()) as {
          error?: string;
          hint?: string;
        };
        if (cancelled) {
          return;
        }
        if (isVaultUnavailableStatus(postResponse.status, postData.hint, postData.error)) {
          applyUnavailable();
          return;
        }
        if (!postResponse.ok) {
          setError(postData.error ?? "vault_ensure_failed");
          return;
        }

        const again = await fetch("/api/vault", { credentials: "include" });
        const againData = (await again.json()) as VaultGetBody;
        if (cancelled) {
          return;
        }
        if (isVaultUnavailableStatus(again.status, againData.hint, againData.error)) {
          applyUnavailable();
          return;
        }
        setPersisted(Boolean(againData.persisted));
        setVault(againData.vault ?? null);
        setObjects(againData.objects ?? []);
        setError(null);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "vault_boot_failed");
        }
      } finally {
        inFlightRef.current = false;
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applyUnavailable, enabled, user?.id, vaultAvailable]);

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
