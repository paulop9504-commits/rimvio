"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { tryCreateClient } from "@/lib/supabase/client";

async function prepareRealtimeClient(supabase: SupabaseClient): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    return;
  }
  await supabase.realtime.setAuth(data.session.access_token);
}

function subscribeTable(
  channelName: string,
  table: string,
  filter: string | undefined,
  onChange: () => void,
): () => void {
  const supabase = tryCreateClient();
  if (!supabase) {
    return () => undefined;
  }

  let disposed = false;
  let channel: ReturnType<SupabaseClient["channel"]> | null = null;

  void prepareRealtimeClient(supabase).then(() => {
    if (disposed) {
      return;
    }
    channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          ...(filter ? { filter } : {}),
        },
        () => onChange(),
      )
      .subscribe();
  });

  return () => {
    disposed = true;
    if (channel) {
      void supabase.removeChannel(channel);
    }
  };
}

export function subscribePcAgentDevicesRealtime(
  userId: string,
  onChange: () => void,
): () => void {
  if (!userId.trim()) {
    return () => undefined;
  }
  return subscribeTable(
    `pc-agent-devices:${userId}`,
    "pc_local_agent_devices",
    `user_id=eq.${userId}`,
    onChange,
  );
}

export function subscribePcAgentTasksRealtime(
  userId: string,
  onChange: () => void,
): () => void {
  if (!userId.trim()) {
    return () => undefined;
  }
  return subscribeTable(
    `pc-agent-tasks:${userId}`,
    "pc_local_agent_tasks",
    `user_id=eq.${userId}`,
    onChange,
  );
}

export function subscribePcAgentCapabilityRequestsRealtime(
  userId: string,
  onChange: () => void,
): () => void {
  if (!userId.trim()) {
    return () => undefined;
  }
  return subscribeTable(
    `pc-agent-capability-requests:${userId}`,
    "pc_local_agent_capability_requests",
    `user_id=eq.${userId}`,
    onChange,
  );
}

export function subscribePcAgentInstallJobsRealtime(
  deviceId: string,
  onChange: () => void,
): () => void {
  if (!deviceId.trim()) {
    return () => undefined;
  }
  return subscribeTable(
    `pc-agent-install-jobs:${deviceId}`,
    "pc_local_agent_install_jobs",
    `device_id=eq.${deviceId}`,
    onChange,
  );
}
