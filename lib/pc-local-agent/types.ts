export type PcAgentDeviceStatus = "ONLINE" | "OFFLINE";
export type PcAgentDeviceType = "PC";

export type PcAgentTaskStatus =
  | "CREATED"
  | "QUEUED"
  | "RUNNING"
  | "WAITING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type PcAgentTaskType = "OPEN_URL";

export type OpenUrlPayload = {
  url: string;
  requiredCapabilities?: string[];
  waitReason?: "capability_required";
  resumeAfterInstall?: boolean;
};

export type PcAgentTaskPayload = OpenUrlPayload;

export type OpenUrlResult = {
  success: boolean;
  url: string;
};

export type PcAgentDevice = {
  id: string;
  user_id: string;
  name: string;
  type: PcAgentDeviceType;
  status: PcAgentDeviceStatus;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PcAgentTask = {
  id: string;
  user_id: string;
  device_id: string;
  type: PcAgentTaskType;
  payload: PcAgentTaskPayload;
  status: PcAgentTaskStatus;
  result: OpenUrlResult | null;
  error: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  claimed_by_agent_at: string | null;
  waiting_expires_at: string | null;
};

export type PcAgentPairingResponse = {
  code: string;
  expiresAt: string;
};

export type PcAgentConnectResponse = {
  deviceId: string;
  deviceToken: string;
  deviceName: string;
};

export const PC_AGENT_HEARTBEAT_INTERVAL_MS = 15_000;
export const PC_AGENT_HEARTBEAT_TIMEOUT_MS = 45_000;
export const PC_AGENT_PAIRING_CODE_TTL_MS = 10 * 60 * 1000;
export const PC_AGENT_TASK_POLL_INTERVAL_MS = 2_000;
export const PC_AGENT_TASK_TIMEOUT_MS = 120_000;
export const PC_AGENT_WAITING_TIMEOUT_MS = 15 * 60 * 1000;
