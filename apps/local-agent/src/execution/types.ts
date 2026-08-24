export type AgentTask = {
  id: string;
  user_id: string;
  device_id: string;
  type: string;
  payload: {
    url?: string;
    title?: string;
    query?: string;
    intent?: "purchase";
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
  phase?: string;
  screenshotJpeg?: string;
  product?: {
    title?: string;
    price?: string;
    delivery?: string;
  };
  hold?: "waiting_user" | "human_required" | "none";
};

export type ProgressReporter = (input: {
  phase: string;
  message?: string;
  url?: string;
  screenshotJpeg?: string;
  product?: ExecutionResult["product"];
  graphNode?: string;
}) => Promise<void>;

export interface ExecutionEngine {
  execute(task: AgentTask, report?: ProgressReporter): Promise<ExecutionResult>;
  checkout?(task: AgentTask, report?: ProgressReporter): Promise<ExecutionResult>;
  snapshot?(): Promise<string | undefined>;
}

export type InstallJob = {
  id: string;
  request_id: string;
  device_id: string;
  capability_id: string;
  status: string;
  progress_pct?: number;
};
