"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { PcAgentDevice, PcAgentTask } from "@/lib/pc-local-agent";
import {
  DEMO_CAPABILITY_ID,
  PDF_CAPABILITY_ID,
} from "@/lib/pc-local-agent/capabilities/types";
import type {
  CapabilityDefinition,
  CapabilityRequest,
  InstallJob,
} from "@/lib/pc-local-agent/capabilities/types";
import {
  subscribePcAgentCapabilityRequestsRealtime,
  subscribePcAgentDevicesRealtime,
  subscribePcAgentInstallJobsRealtime,
  subscribePcAgentTasksRealtime,
} from "@/lib/pc-local-agent/client-realtime";

export type EnrichedCapabilityRequest = CapabilityRequest & {
  capabilities: CapabilityDefinition[];
};

export type InstalledCapabilityView = {
  capability_id: string;
  name: string;
  version: string;
  catalogVersion: string;
  updateAvailable: boolean;
  installed_at: string;
};

export type EnrichedInstallJob = InstallJob & {
  capabilityName?: string;
};

export function usePcLocalAgent() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<PcAgentDevice[]>([]);
  const [tasks, setTasks] = useState<PcAgentTask[]>([]);
  const [pendingRequests, setPendingRequests] = useState<EnrichedCapabilityRequest[]>([]);
  const [installedCapabilities, setInstalledCapabilities] = useState<InstalledCapabilityView[]>([]);
  const [activeInstallJobs, setActiveInstallJobs] = useState<EnrichedInstallJob[]>([]);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingExpiresAt, setPairingExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTask, setActiveTask] = useState<PcAgentTask | null>(null);
  const activeTaskRef = useRef<PcAgentTask | null>(null);
  activeTaskRef.current = activeTask;

  const refreshDevices = useCallback(async () => {
    if (!user) {
      setDevices([]);
      return;
    }
    const res = await fetch("/api/pc-agent/devices");
    if (!res.ok) {
      return;
    }
    const data = (await res.json()) as { devices: PcAgentDevice[] };
    setDevices(data.devices ?? []);
  }, [user]);

  const refreshTasks = useCallback(async () => {
    if (!user) {
      setTasks([]);
      return;
    }
    const res = await fetch("/api/pc-agent/tasks?limit=5");
    if (!res.ok) {
      return;
    }
    const data = (await res.json()) as { tasks: PcAgentTask[] };
    setTasks(data.tasks ?? []);
  }, [user]);

  const refreshCapabilityRequests = useCallback(async () => {
    if (!user) {
      setPendingRequests([]);
      return;
    }
    const res = await fetch("/api/pc-agent/capability-requests");
    if (!res.ok) {
      return;
    }
    const data = (await res.json()) as { requests: EnrichedCapabilityRequest[] };
    setPendingRequests(data.requests ?? []);
  }, [user]);

  const refreshInstalledCapabilities = useCallback(
    async (deviceId?: string) => {
      if (!user || !deviceId) {
        setInstalledCapabilities([]);
        return;
      }
      const res = await fetch(`/api/pc-agent/capabilities?deviceId=${deviceId}`);
      if (!res.ok) {
        return;
      }
      const data = (await res.json()) as { installed: InstalledCapabilityView[] };
      setInstalledCapabilities(data.installed ?? []);
    },
    [user],
  );

  const refreshInstallJobs = useCallback(
    async (deviceId?: string) => {
      if (!user) {
        setActiveInstallJobs([]);
        return;
      }
      const qs = deviceId ? `?deviceId=${deviceId}` : "";
      const res = await fetch(`/api/pc-agent/install-jobs${qs}`);
      if (!res.ok) {
        return;
      }
      const data = (await res.json()) as { jobs: EnrichedInstallJob[] };
      setActiveInstallJobs(data.jobs ?? []);
    },
    [user],
  );

  const onlineDevice = devices.find((d) => d.status === "ONLINE") ?? null;

  useEffect(() => {
    void refreshDevices();
    void refreshTasks();
    void refreshCapabilityRequests();
  }, [refreshDevices, refreshTasks, refreshCapabilityRequests]);

  useEffect(() => {
    if (onlineDevice?.id) {
      void refreshInstalledCapabilities(onlineDevice.id);
      void refreshInstallJobs(onlineDevice.id);
    }
  }, [onlineDevice?.id, refreshInstalledCapabilities, refreshInstallJobs]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }
    const unsubDevices = subscribePcAgentDevicesRealtime(user.id, () => {
      void refreshDevices();
    });
    const unsubTasks = subscribePcAgentTasksRealtime(user.id, () => {
      void refreshTasks();
      const current = activeTaskRef.current;
      if (current) {
        void fetch(`/api/pc-agent/tasks/${current.id}`)
          .then((r) => r.json())
          .then((d: { task?: PcAgentTask }) => {
            if (d.task) {
              setActiveTask(d.task);
            }
          })
          .catch(() => undefined);
      }
    });
    const unsubRequests = subscribePcAgentCapabilityRequestsRealtime(user.id, () => {
      void refreshCapabilityRequests();
    });
    const unsubInstall =
      onlineDevice?.id
        ? subscribePcAgentInstallJobsRealtime(onlineDevice.id, () => {
            void refreshInstallJobs(onlineDevice.id);
            void refreshInstalledCapabilities(onlineDevice.id);
          })
        : () => undefined;

    return () => {
      unsubDevices();
      unsubTasks();
      unsubRequests();
      unsubInstall();
    };
  }, [
    user?.id,
    onlineDevice?.id,
    refreshDevices,
    refreshTasks,
    refreshCapabilityRequests,
    refreshInstallJobs,
    refreshInstalledCapabilities,
  ]);

  const createPairingCode = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pc-agent/pairing", { method: "POST" });
      if (!res.ok) {
        throw new Error("pairing_failed");
      }
      const data = (await res.json()) as { code: string; expiresAt: string };
      setPairingCode(data.code);
      setPairingExpiresAt(data.expiresAt);
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  const createTask = useCallback(
    async (deviceId: string, requiredCapabilities?: string[]) => {
      setLoading(true);
      try {
        const res = await fetch("/api/pc-agent/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceId,
            type: "OPEN_URL",
            payload: {
              url: "https://www.coupang.com/np/search?q=%EC%83%9D%EC%88%98",
              title: "생수 구매",
              query: "생수",
              intent: "purchase",
              ...(requiredCapabilities?.length ? { requiredCapabilities } : {}),
            },
          }),
        });
        if (!res.ok) {
          const err = (await res.json()) as { error?: string };
          throw new Error(err.error ?? "task_failed");
        }
        const data = (await res.json()) as { task: PcAgentTask };
        setActiveTask(data.task);
        void refreshTasks();
        return data.task;
      } finally {
        setLoading(false);
      }
    },
    [refreshTasks],
  );

  const runTestTask = useCallback(
    async (deviceId: string) => createTask(deviceId),
    [createTask],
  );

  const runCapabilityTestTask = useCallback(
    async (deviceId: string) => createTask(deviceId, [DEMO_CAPABILITY_ID]),
    [createTask],
  );

  const runPdfCapabilityTestTask = useCallback(
    async (deviceId: string) => createTask(deviceId, [PDF_CAPABILITY_ID]),
    [createTask],
  );

  const approveCapabilityRequest = useCallback(
    async (requestId: string) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/pc-agent/capability-requests/${requestId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "approve" }),
        });
        if (!res.ok) {
          throw new Error("approve_failed");
        }
        void refreshCapabilityRequests();
        void refreshTasks();
        if (onlineDevice?.id) {
          void refreshInstallJobs(onlineDevice.id);
        }
      } finally {
        setLoading(false);
      }
    },
    [refreshCapabilityRequests, refreshTasks, refreshInstallJobs, onlineDevice?.id],
  );

  const cancelCapabilityRequest = useCallback(
    async (requestId: string) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/pc-agent/capability-requests/${requestId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "cancel" }),
        });
        if (!res.ok) {
          throw new Error("cancel_failed");
        }
        void refreshCapabilityRequests();
        void refreshTasks();
      } finally {
        setLoading(false);
      }
    },
    [refreshCapabilityRequests, refreshTasks],
  );

  return {
    devices,
    tasks,
    pendingRequests,
    installedCapabilities,
    activeInstallJobs,
    onlineDevice,
    pairingCode,
    pairingExpiresAt,
    loading,
    activeTask,
    createPairingCode,
    runTestTask,
    runCapabilityTestTask,
    runPdfCapabilityTestTask,
    approveCapabilityRequest,
    cancelCapabilityRequest,
    refreshDevices,
    refreshTasks,
    refreshCapabilityRequests,
    refreshInstalledCapabilities,
    refreshInstallJobs,
  };
}
