"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { PcAgentDevice } from "@/lib/pc-local-agent";
import { subscribePcAgentDevicesRealtime } from "@/lib/pc-local-agent/client-realtime";

export function usePcOnlineDevice(): PcAgentDevice | null {
  const { user } = useAuth();
  const [device, setDevice] = useState<PcAgentDevice | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setDevice(null);
      return;
    }
    const res = await fetch("/api/pc-agent/devices", { cache: "no-store" });
    if (!res.ok) {
      setDevice(null);
      return;
    }
    const data = (await res.json()) as { devices?: PcAgentDevice[] };
    const list = data.devices ?? [];
    setDevice(list.find((row) => row.status === "ONLINE") ?? null);
  }, [user]);

  useEffect(() => {
    void refresh();
    if (!user?.id) {
      return;
    }
    return subscribePcAgentDevicesRealtime(user.id, () => void refresh());
  }, [user?.id, refresh]);

  return device;
}
