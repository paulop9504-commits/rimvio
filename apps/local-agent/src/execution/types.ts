export type AgentTask = {
  id: string;
  user_id: string;
  device_id: string;
  type: string;
  payload: {
    url?: string;
    requiredCapabilities?: string[];
    waitReason?: string;
    resumeAfterInstall?: boolean;
  };
  status: string;
  result: Record<string, unknown> | null;
  error: string | null;
};

export type ExecutionResult = {
  success: boolean;
  url?: string;
  message?: string;
};

export interface ExecutionEngine {
  execute(task: AgentTask): Promise<ExecutionResult>;
}

export type InstallJob = {
  id: string;
  request_id: string;
  device_id: string;
  capability_id: string;
  status: string;
  progress_pct?: number;
};
