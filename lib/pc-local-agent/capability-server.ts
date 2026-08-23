import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  BUILTIN_CAPABILITY_IDS,
  expandCapabilityDependencies,
  getCapabilityDefinition,
  getCapabilityDefinitions,
} from "@/lib/pc-local-agent/capabilities";
import type {
  CapabilityRequest,
  InstallJob,
  InstalledCapability,
} from "@/lib/pc-local-agent/capabilities/types";
import { PC_AGENT_WAITING_TIMEOUT_MS } from "@/lib/pc-local-agent/types";

export async function seedBuiltinCapabilities(deviceId: string): Promise<void> {
  const admin = createServiceRoleClient();
  if (!admin) {
    return;
  }

  const rows = BUILTIN_CAPABILITY_IDS.map((capability_id) => ({
    device_id: deviceId,
    capability_id,
    version: "1.0.0",
    status: "installed" as const,
  }));

  await admin.from("pc_local_agent_capabilities").upsert(rows, {
    onConflict: "device_id,capability_id",
  });
}

export async function getInstalledCapabilities(
  deviceId: string,
): Promise<InstalledCapability[]> {
  const admin = createServiceRoleClient();
  if (!admin) {
    return [];
  }

  const { data } = await admin
    .from("pc_local_agent_capabilities")
    .select("*")
    .eq("device_id", deviceId)
    .eq("status", "installed")
    .order("installed_at", { ascending: false });

  return (data ?? []) as InstalledCapability[];
}

export async function getInstalledCapabilityIds(deviceId: string): Promise<string[]> {
  const admin = createServiceRoleClient();
  if (!admin) {
    return [...BUILTIN_CAPABILITY_IDS];
  }

  const { data } = await admin
    .from("pc_local_agent_capabilities")
    .select("capability_id")
    .eq("device_id", deviceId)
    .eq("status", "installed");

  const ids = (data ?? []).map((r) => r.capability_id);
  return [...new Set([...BUILTIN_CAPABILITY_IDS, ...ids])];
}

export async function createCapabilityRequest(input: {
  userId: string;
  deviceId: string;
  taskId: string;
  missingCapabilities: string[];
  reason?: string;
}): Promise<CapabilityRequest | null> {
  const admin = createServiceRoleClient();
  if (!admin) {
    return null;
  }

  const expanded = expandCapabilityDependencies(input.missingCapabilities);
  const installable = getCapabilityDefinitions(expanded).filter((c) => c.tier !== "builtin");
  const required = installable.map((c) => c.id);

  if (required.length === 0) {
    return null;
  }

  const { data, error } = await admin
    .from("pc_local_agent_capability_requests")
    .insert({
      user_id: input.userId,
      device_id: input.deviceId,
      task_id: input.taskId,
      required_capabilities: required,
      reason: input.reason ?? "capability_required",
      status: "pending",
    })
    .select("*")
    .single();

  if (error || !data) {
    return null;
  }

  return data as CapabilityRequest;
}

export async function approveCapabilityRequest(
  requestId: string,
  userId: string,
): Promise<{ request: CapabilityRequest; jobs: InstallJob[] } | null> {
  const admin = createServiceRoleClient();
  if (!admin) {
    return null;
  }

  const { data: request } = await admin
    .from("pc_local_agent_capability_requests")
    .select("*")
    .eq("id", requestId)
    .eq("user_id", userId)
    .eq("status", "pending")
    .maybeSingle();

  if (!request) {
    return null;
  }

  const now = new Date().toISOString();
  const { data: updated } = await admin
    .from("pc_local_agent_capability_requests")
    .update({ status: "approved", approved_at: now })
    .eq("id", requestId)
    .eq("status", "pending")
    .select("*")
    .single();

  if (!updated) {
    return null;
  }

  const jobsPayload = (request.required_capabilities as string[]).map((capability_id) => ({
    request_id: requestId,
    device_id: request.device_id,
    capability_id,
    status: "queued" as const,
  }));

  const { data: jobs, error: jobsError } = await admin
    .from("pc_local_agent_install_jobs")
    .insert(jobsPayload)
    .select("*");

  if (jobsError) {
    return null;
  }

  return {
    request: updated as CapabilityRequest,
    jobs: (jobs ?? []) as InstallJob[],
  };
}

export async function cancelCapabilityRequest(
  requestId: string,
  userId: string,
): Promise<boolean> {
  const admin = createServiceRoleClient();
  if (!admin) {
    return false;
  }

  const { data: request } = await admin
    .from("pc_local_agent_capability_requests")
    .select("id, task_id, status")
    .eq("id", requestId)
    .eq("user_id", userId)
    .eq("status", "pending")
    .maybeSingle();

  if (!request) {
    return false;
  }

  const now = new Date().toISOString();
  await admin
    .from("pc_local_agent_capability_requests")
    .update({ status: "cancelled", completed_at: now })
    .eq("id", requestId);

  await admin
    .from("pc_local_agent_tasks")
    .update({
      status: "CANCELLED",
      completed_at: now,
      error: "capability_install_cancelled",
    })
    .eq("id", request.task_id)
    .eq("status", "WAITING");

  return true;
}

export async function expireStaleWaitingTasks(userId?: string): Promise<number> {
  const admin = createServiceRoleClient();
  if (!admin) {
    return 0;
  }

  const now = new Date().toISOString();
  let query = admin
    .from("pc_local_agent_tasks")
    .select("id, user_id")
    .eq("status", "WAITING")
    .lt("waiting_expires_at", now);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data: stale } = await query;
  if (!stale?.length) {
    return 0;
  }

  for (const task of stale) {
    await admin
      .from("pc_local_agent_tasks")
      .update({
        status: "FAILED",
        error: "waiting_timeout",
        completed_at: now,
      })
      .eq("id", task.id)
      .eq("status", "WAITING");

    await admin
      .from("pc_local_agent_capability_requests")
      .update({ status: "cancelled", completed_at: now })
      .eq("task_id", task.id)
      .eq("status", "pending");
  }

  return stale.length;
}

export async function updateInstallJobProgress(
  jobId: string,
  deviceId: string,
  progressPct: number,
): Promise<void> {
  const admin = createServiceRoleClient();
  if (!admin) {
    return;
  }

  await admin
    .from("pc_local_agent_install_jobs")
    .update({ progress_pct: Math.min(100, Math.max(0, progressPct)) })
    .eq("id", jobId)
    .eq("device_id", deviceId)
    .eq("status", "running");
}

export async function completeInstallJob(
  jobId: string,
  deviceId: string,
): Promise<{ resumed: boolean; taskId?: string }> {
  const admin = createServiceRoleClient();
  if (!admin) {
    return { resumed: false };
  }

  const now = new Date().toISOString();

  const { data: job } = await admin
    .from("pc_local_agent_install_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("device_id", deviceId)
    .in("status", ["queued", "running"])
    .maybeSingle();

  if (!job) {
    return { resumed: false };
  }

  await admin
    .from("pc_local_agent_install_jobs")
    .update({
      status: "completed",
      completed_at: now,
      started_at: job.started_at ?? now,
      progress_pct: 100,
    })
    .eq("id", jobId);

  const catalogVersion = getCapabilityDefinition(job.capability_id)?.version ?? "1.0.0";

  await admin.from("pc_local_agent_capabilities").upsert(
    {
      device_id: deviceId,
      capability_id: job.capability_id,
      version: catalogVersion,
      status: "installed",
      installed_at: now,
      metadata: { installed_via: "install_job", job_id: jobId },
    },
    { onConflict: "device_id,capability_id" },
  );

  const { data: pendingJobs } = await admin
    .from("pc_local_agent_install_jobs")
    .select("id")
    .eq("request_id", job.request_id)
    .in("status", ["queued", "running"]);

  if (pendingJobs && pendingJobs.length > 0) {
    return { resumed: false };
  }

  const { data: request } = await admin
    .from("pc_local_agent_capability_requests")
    .select("id, task_id")
    .eq("id", job.request_id)
    .maybeSingle();

  if (!request) {
    return { resumed: false };
  }

  await admin
    .from("pc_local_agent_capability_requests")
    .update({ status: "completed", completed_at: now })
    .eq("id", request.id);

  await admin
    .from("pc_local_agent_tasks")
    .update({
      status: "QUEUED",
      error: null,
    })
    .eq("id", request.task_id)
    .eq("status", "WAITING");

  return { resumed: true, taskId: request.task_id };
}

export async function failInstallJob(
  jobId: string,
  deviceId: string,
  errorMessage: string,
): Promise<void> {
  const admin = createServiceRoleClient();
  if (!admin) {
    return;
  }

  const now = new Date().toISOString();
  const { data: job } = await admin
    .from("pc_local_agent_install_jobs")
    .select("request_id, capability_id")
    .eq("id", jobId)
    .eq("device_id", deviceId)
    .maybeSingle();

  if (!job) {
    return;
  }

  await admin
    .from("pc_local_agent_install_jobs")
    .update({
      status: "failed",
      error: errorMessage,
      completed_at: now,
    })
    .eq("id", jobId);

  const { data: request } = await admin
    .from("pc_local_agent_capability_requests")
    .select("task_id")
    .eq("id", job.request_id)
    .maybeSingle();

  if (request) {
    await admin
      .from("pc_local_agent_tasks")
      .update({
        status: "FAILED",
        error: `install_failed:${job.capability_id}`,
        completed_at: now,
      })
      .eq("id", request.task_id);
  }
}
